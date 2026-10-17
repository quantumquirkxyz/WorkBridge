import { createHash, randomUUID } from "node:crypto";
import {
  assertAuditEvent,
  assertMatchDecision,
  assertWorkflowEnvelope,
  type AuditEvent,
  type MatchDecision,
} from "@puente/domain";
import { generateDocuments, type ApplicationDocuments } from "./draft";
import { ApplicationError } from "./errors";
import { parseEvidence, type EvidenceItem } from "./evidence";
import { counselorGateReasons, type GateReason } from "./gates";
import { actorFromBetterAuthSession, type Actor, type AuthRole } from "./roles";
import { assertNoSecrets } from "./secrets";
import { createMemoryIdempotencyStore, type IdempotencyStore } from "./store";

export interface DraftInput {
  traceId: string;
  idempotencyKey: string;
  candidateId: string;
  vacancyId: string;
  vacancyTitle: string;
  employerOrgId?: string;
  candidateDisplayName?: string;
  evidence: EvidenceItem[];
  match: MatchDecision;
}

export interface ActionInput {
  traceId: string;
  idempotencyKey: string;
  reason: string;
}

export interface DraftView {
  draftId: string;
  candidateId: string;
  vacancyId: string;
  employerOrgId?: string;
  traceId: string;
  vacancyTitle: string;
  candidateDisplayName?: string;
  evidence: EvidenceItem[];
  status: "open" | "rejected" | "submitted";
  documents: ApplicationDocuments;
  counselorGate: GateReason[];
  candidateApproved: boolean;
  counselorApproved: boolean;
  history: HistoryEntry[];
}

export interface SubmitView {
  submissionId: string;
  draftId: string;
  replayed: boolean;
  interview: "pending_employer_approval" | "approved" | "rejected";
  employerOrgId?: string;
  traceId?: string;
  vacancyTitle?: string;
  documents?: ApplicationDocuments;
  evidence?: EvidenceItem[];
  history?: HistoryEntry[];
}

export interface SubmissionSummary {
  submissionId: string;
  vacancyTitle: string;
  interview: SubmitView["interview"];
  traceId: string;
}

export interface HistoryEntry {
  action: string;
  actorRole: AuthRole;
  timestamp: string;
  reason: string;
}

interface Decision {
  actorId: string;
  actorRole: AuthRole;
  reason: string;
  timestamp: string;
  evidenceIds: string[];
}

interface StoredDraft {
  id: string;
  ownerId: string;
  input: DraftInput;
  selectedEvidenceIds: string[];
  status: "open" | "rejected" | "submitted";
  candidateApproval?: Decision;
  counselorApproval?: Decision;
  history: HistoryEntry[];
}

interface StoredSubmission {
  id: string;
  draftId: string;
  fingerprint: string;
  interview: SubmitView["interview"];
  employerApproval?: Decision;
  employerRejection?: Decision;
  history: HistoryEntry[];
}

export interface ApplicationServiceOptions {
  clock?: () => string;
  ids?: () => string;
  secrets?: readonly string[];
  sessionSecret?: string;
  idempotency?: IdempotencyStore<SubmitView>;
}

export class ApplicationService {
  private readonly clock: () => string;
  private readonly ids: () => string;
  private readonly secrets: readonly string[];
  private readonly sessionSecret: string;
  private readonly idempotency: IdempotencyStore<SubmitView>;
  private readonly drafts = new Map<string, StoredDraft>();
  private readonly submissions = new Map<string, StoredSubmission>();
  private readonly events: AuditEvent[] = [];

  constructor(options: ApplicationServiceOptions = {}) {
    this.clock = options.clock ?? (() => new Date().toISOString());
    this.ids = options.ids ?? (() => randomUUID());
    this.secrets = options.secrets ?? [];
    this.sessionSecret = options.sessionSecret ?? "";
    this.idempotency = options.idempotency ?? createMemoryIdempotencyStore<SubmitView>();
  }

  createDraft(session: unknown, raw: unknown): DraftView {
    const actor = this.actor(session);
    this.requireRole(actor, "candidate", "Only a candidate can draft an application.");
    const input = this.parseDraftInput(raw);
    if (actor.id !== input.candidateId) {
      throw new ApplicationError("A candidate can only draft their own application.", 403, "forbidden");
    }
    const draft: StoredDraft = {
      id: this.ids(),
      ownerId: actor.id,
      input,
      selectedEvidenceIds: input.evidence.map((item) => item.id),
      status: "open",
      history: [],
    };
    this.drafts.set(draft.id, draft);
    return this.draftView(draft);
  }

  correctDraft(session: unknown, draftId: string, raw: unknown): DraftView {
    const actor = this.actor(session);
    const draft = this.ownedOpenDraft(actor, draftId);
    const action = this.parseAction(raw, draft.input.traceId);
    const includeEvidenceIds = this.stringArray(raw, "includeEvidenceIds");
    const selected = new Set(includeEvidenceIds);
    if ([...selected].some((id) => !draft.input.evidence.some((item) => item.id === id))) {
      throw new ApplicationError("Correction references evidence that was not declared.", 422, "unknown_evidence");
    }
    this.guard({ ...action, includeEvidenceIds });
    const previousKey = evidenceKey(draft.selectedEvidenceIds);
    draft.selectedEvidenceIds = [...selected];
    if (evidenceKey(draft.selectedEvidenceIds) !== previousKey) {
      delete draft.candidateApproval;
      delete draft.counselorApproval;
    }
    this.audit(actor, "correction", action);
    draft.history.push(this.historyEntry(actor, "correction", action.reason));
    return this.draftView(draft);
  }

  approveDraft(session: unknown, draftId: string, raw: unknown): DraftView {
    const actor = this.actor(session);
    const draft = this.openDraft(draftId);
    const action = this.parseAction(raw, draft.input.traceId);
    this.guard(action);
    this.requireDraftParty(actor, draft, "approve");
    if (actor.role === "candidate") {
      draft.candidateApproval = this.decision(actor, action.reason, draft.selectedEvidenceIds);
    } else {
      draft.counselorApproval = this.decision(actor, action.reason, draft.selectedEvidenceIds);
    }
    this.audit(actor, "approval", action);
    draft.history.push(this.historyEntry(actor, "approval", action.reason));
    return this.draftView(draft);
  }

  rejectDraft(session: unknown, draftId: string, raw: unknown): DraftView {
    const actor = this.actor(session);
    const draft = this.openDraft(draftId);
    const action = this.parseAction(raw, draft.input.traceId);
    this.guard(action);
    this.requireDraftParty(actor, draft, "reject");
    draft.status = "rejected";
    this.audit(actor, "rejection", action);
    draft.history.push(this.historyEntry(actor, "rejection", action.reason));
    return this.draftView(draft);
  }

  async submit(session: unknown, draftId: string, raw: unknown): Promise<SubmitView> {
    const actor = this.actor(session);
    this.requireRole(actor, "candidate", "Only the candidate can submit the application.");
    const draft = this.draftById(draftId);
    if (actor.id !== draft.ownerId) {
      throw new ApplicationError("A candidate can only submit their own application.", 403, "forbidden");
    }
    const action = this.parseAction(raw, draft.input.traceId);
    this.guard(action);
    if (draft.status === "rejected") {
      throw new ApplicationError("A rejected draft cannot be submitted.", 422, "draft_rejected");
    }
    const fingerprint = this.fingerprint(draft);
    const existing = await this.idempotency.get(action.idempotencyKey);
    if (existing) {
      if (existing.fingerprint !== fingerprint) {
        throw new ApplicationError(
          "This idempotency key was already used for a different submission.",
          409,
          "idempotency_conflict",
        );
      }
      return { ...existing.response, replayed: true };
    }
    if (draft.status === "submitted") {
      throw new ApplicationError("This draft was already submitted.", 409, "already_submitted");
    }
    if (!this.approvalCovers(draft.candidateApproval, draft.selectedEvidenceIds)) {
      throw new ApplicationError("Candidate approval is required before submission.", 422, "candidate_approval_required");
    }
    if (
      this.hasCounselorGate(draft) &&
      !this.approvalCovers(draft.counselorApproval, draft.selectedEvidenceIds)
    ) {
      throw new ApplicationError("Counselor approval is required before submission.", 422, "counselor_approval_required");
    }
    const submission: StoredSubmission = {
      id: this.ids(),
      draftId: draft.id,
      fingerprint,
      interview: "pending_employer_approval",
      history: [...draft.history, this.historyEntry(actor, "submission", action.reason)],
    };
    draft.status = "submitted";
    this.submissions.set(submission.id, submission);
    this.audit(actor, "submission", action);
    const view = this.submitView(submission, false);
    await this.idempotency.put({ key: action.idempotencyKey, fingerprint, response: view });
    return view;
  }

  decideInterview(session: unknown, submissionId: string, raw: unknown): SubmitView {
    const actor = this.actor(session);
    this.requireRole(actor, "employer", "Only an employer can decide interview progression.");
    const submission = this.submissionById(submissionId);
    const draft = this.draftById(submission.draftId);
    this.requireEmployerOrganization(actor, draft);
    const action = this.parseAction(raw, draft.input.traceId);
    const decision = this.decisionValue(raw);
    this.guard(action);
    if (submission.interview !== "pending_employer_approval") {
      throw new ApplicationError("Interview progression was already decided.", 409, "interview_decided");
    }
    if (decision === "rejected") {
      submission.employerRejection = this.decision(actor, action.reason, []);
      submission.interview = "rejected";
      this.audit(actor, "rejection", action);
      submission.history.push(this.historyEntry(actor, "rejection", action.reason));
    } else if (!submission.employerApproval) {
      throw new ApplicationError(
        "Employer approval is required before interview progression.",
        422,
        "employer_approval_required",
      );
    } else {
      submission.interview = "approved";
      this.audit(actor, "approval", action);
      submission.history.push(this.historyEntry(actor, "approval", action.reason));
    }
    return this.submitView(submission, false);
  }

  approveInterview(session: unknown, submissionId: string, raw: unknown): SubmitView {
    const actor = this.actor(session);
    this.requireRole(actor, "employer", "Only an employer can approve interview progression.");
    const submission = this.submissionById(submissionId);
    const draft = this.draftById(submission.draftId);
    this.requireEmployerOrganization(actor, draft);
    const action = this.parseAction(raw, draft.input.traceId);
    this.guard(action);
    if (submission.employerRejection || submission.interview === "rejected") {
      throw new ApplicationError("A rejected interview cannot be approved.", 409, "interview_decided");
    }
    submission.employerApproval = this.decision(actor, action.reason, []);
    this.audit(actor, "approval", action);
    submission.history.push(this.historyEntry(actor, "approval", action.reason));
    return this.submitView(submission, false);
  }

  auditTrail(session: unknown, traceId: string): AuditEvent[] {
    this.actor(session);
    if (traceId.trim() === "") {
      throw new ApplicationError("traceId is required.", 422, "invalid_input");
    }
    return this.events.filter((event) => event.traceId === traceId).map((event) => ({ ...event }));
  }

  listDrafts(session: unknown, query: { candidateId?: string; gate?: string; pending?: boolean } = {}): DraftView[] {
    const actor = this.actor(session);
    let drafts: StoredDraft[];
    if (query.gate === "counselor" && query.pending === true) {
      this.requireRole(actor, "counselor", "Only a counselor can review gated drafts.");
      drafts = [...this.drafts.values()].filter(
        (draft) => draft.status === "open" && this.hasCounselorGate(draft) && !draft.counselorApproval,
      );
    } else {
      this.requireRole(actor, "candidate", "Only the candidate can list their drafts.");
      if (!query.candidateId || query.candidateId !== actor.id) {
        throw new ApplicationError("A candidate can only list their own drafts.", 403, "forbidden");
      }
      drafts = [...this.drafts.values()].filter((draft) => draft.ownerId === actor.id);
    }
    return drafts.map((draft) => this.draftView(draft));
  }

  readDraft(session: unknown, draftId: string): DraftView {
    const actor = this.actor(session);
    const draft = this.draftById(draftId);
    if (actor.role !== "counselor" && (actor.role !== "candidate" || actor.id !== draft.ownerId)) {
      throw new ApplicationError("This draft is not available to the current actor.", 403, "forbidden");
    }
    if (actor.role === "counselor" && !this.hasCounselorGate(draft)) {
      throw new ApplicationError("Counselors can only read drafts with gate reasons.", 403, "forbidden");
    }
    return this.draftView(draft);
  }

  listSubmissions(session: unknown, interview: string): SubmissionSummary[] {
    const actor = this.actor(session);
    this.requireRole(actor, "employer", "Only an employer can list submissions.");
    if (interview !== "pending_employer_approval") {
      throw new ApplicationError("Only pending employer approvals can be listed.", 422, "invalid_input");
    }
    return [...this.submissions.values()]
      .filter((submission) => {
        const draft = this.draftById(submission.draftId);
        return submission.interview === interview && this.employerOwns(actor, draft);
      })
      .map((submission) => {
        const draft = this.draftById(submission.draftId);
        return {
          submissionId: submission.id,
          vacancyTitle: draft.input.vacancyTitle,
          interview: submission.interview,
          traceId: draft.input.traceId,
        };
      });
  }

  readSubmission(session: unknown, submissionId: string): SubmitView {
    const actor = this.actor(session);
    this.requireRole(actor, "employer", "Only an employer can read submissions.");
    const submission = this.submissionById(submissionId);
    const draft = this.draftById(submission.draftId);
    this.requireEmployerOrganization(actor, draft);
    return this.submitView(submission, false);
  }

  private actor(session: unknown): Actor {
    return actorFromBetterAuthSession(session, this.clock(), this.sessionSecret);
  }

  private requireRole(actor: Actor, role: Actor["role"], message: string): void {
    if (actor.role !== role) throw new ApplicationError(message, 403, "forbidden");
  }

  /** Candidate owner or counselor. Employer is refused for both approval and rejection. */
  private requireDraftParty(actor: Actor, draft: StoredDraft, action: "approve" | "reject"): void {
    if (actor.role === "counselor") return;
    if (actor.role === "candidate") {
      if (actor.id !== draft.ownerId) {
        const verb = action === "approve" ? "approve" : "reject";
        throw new ApplicationError(`A candidate can only ${verb} their own draft.`, 403, "forbidden");
      }
      return;
    }
    const verb = action === "approve" ? "approve" : "reject";
    throw new ApplicationError(`An employer cannot ${verb} an application draft.`, 403, "forbidden");
  }

  private draftById(draftId: string): StoredDraft {
    const draft = this.drafts.get(draftId);
    if (!draft) throw new ApplicationError("Draft not found.", 404, "not_found");
    return draft;
  }

  private openDraft(draftId: string): StoredDraft {
    const draft = this.draftById(draftId);
    if (draft.status !== "open") {
      throw new ApplicationError("This draft can no longer be changed.", 409, "draft_closed");
    }
    return draft;
  }

  private ownedOpenDraft(actor: Actor, draftId: string): StoredDraft {
    this.requireRole(actor, "candidate", "Only the candidate can correct a draft.");
    const draft = this.openDraft(draftId);
    if (actor.id !== draft.ownerId) {
      throw new ApplicationError("A candidate can only correct their own draft.", 403, "forbidden");
    }
    return draft;
  }

  private submissionById(submissionId: string): StoredSubmission {
    const submission = this.submissions.get(submissionId);
    if (!submission) throw new ApplicationError("Submission not found.", 404, "not_found");
    return submission;
  }

  private parseDraftInput(raw: unknown): DraftInput {
    const body = this.objectBody(raw);
    const traceId = this.requiredString(body.traceId, "traceId");
    const idempotencyKey = this.requiredString(body.idempotencyKey, "idempotencyKey");
    const candidateId = this.requiredString(body.candidateId, "candidateId");
    const vacancyId = this.requiredString(body.vacancyId, "vacancyId");
    const vacancyTitle = this.requiredString(body.vacancyTitle, "vacancyTitle");
    const employerOrgId = body.employerOrgId === undefined ? undefined : this.requiredString(body.employerOrgId, "employerOrgId");
    const evidence = parseEvidence(body.evidence);
    assertMatchDecision(body.match);
    if (body.match.candidateId !== candidateId || body.match.vacancyId !== vacancyId) {
      throw new ApplicationError("Match decision does not belong to this candidate and vacancy.", 422, "inconsistent_match");
    }
    if (body.match.traceId !== traceId) {
      throw new ApplicationError("Match decision traceId must equal the workflow traceId.", 422, "trace_mismatch");
    }
    this.assertEnvelope(body.envelope, traceId, idempotencyKey);
    const input: DraftInput = {
      traceId,
      idempotencyKey,
      candidateId,
      vacancyId,
      vacancyTitle,
      employerOrgId,
      candidateDisplayName: typeof body.candidateDisplayName === "string" && body.candidateDisplayName.trim() !== "" ? body.candidateDisplayName.trim() : undefined,
      evidence,
      match: body.match,
    };
    this.guard(input);
    return input;
  }

  private parseAction(raw: unknown, expectedTraceId: string): ActionInput {
    const body = this.objectBody(raw);
    const traceId = this.requiredString(body.traceId, "traceId");
    const idempotencyKey = this.requiredString(body.idempotencyKey, "idempotencyKey");
    if (traceId !== expectedTraceId) {
      throw new ApplicationError("Action traceId must equal the draft traceId.", 422, "trace_mismatch");
    }
    this.assertEnvelope(body.envelope, traceId, idempotencyKey);
    return {
      traceId,
      idempotencyKey,
      reason: this.requiredString(body.reason, "reason"),
    };
  }

  private assertEnvelope(value: unknown, traceId: string, idempotencyKey: string): void {
    try {
      assertWorkflowEnvelope(value);
    } catch (error) {
      throw new ApplicationError(
        error instanceof Error ? error.message : "Workflow envelope is invalid.",
        422,
        "invalid_envelope",
      );
    }
    if (value.traceId !== traceId || value.idempotencyKey !== idempotencyKey) {
      throw new ApplicationError(
        "Workflow envelope does not match traceId and idempotencyKey.",
        422,
        "trace_mismatch",
      );
    }
    if (value.guardrails.some((verdict) => !verdict.allowed)) {
      throw new ApplicationError("A workflow guardrail blocked this request.", 422, "guardrail_blocked");
    }
  }

  private decisionValue(raw: unknown): "approved" | "rejected" {
    const body = this.objectBody(raw);
    if (body.decision !== "approved" && body.decision !== "rejected") {
      throw new ApplicationError("decision must be approved or rejected.", 422, "invalid_input");
    }
    return body.decision;
  }

  private stringArray(raw: unknown, field: string): string[] {
    const body = this.objectBody(raw);
    const value = body[field];
    if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
      throw new ApplicationError(`${field} must be an array of strings.`, 422, "invalid_input");
    }
    return value;
  }

  private objectBody(raw: unknown): Record<string, unknown> {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
      throw new ApplicationError("JSON object body is required.", 422, "invalid_input");
    }
    return raw as Record<string, unknown>;
  }

  private requiredString(value: unknown, field: string): string {
    if (typeof value !== "string" || value.trim() === "") {
      throw new ApplicationError(`${field} is required.`, 422, "invalid_input");
    }
    return value;
  }

  private decision(actor: Actor, reason: string, evidenceIds: readonly string[]): Decision {
    return { actorId: actor.id, actorRole: actor.role, reason, timestamp: this.clock(), evidenceIds: [...evidenceIds] };
  }

  private historyEntry(actor: Actor, action: string, reason: string): HistoryEntry {
    return { action, actorRole: actor.role, timestamp: this.clock(), reason };
  }

  private counselorGate(draft: StoredDraft): GateReason[] {
    const selected = draft.input.evidence.filter((item) => draft.selectedEvidenceIds.includes(item.id));
    return counselorGateReasons(draft.input.match, selected);
  }

  private hasCounselorGate(draft: StoredDraft): boolean {
    return this.counselorGate(draft).length > 0;
  }

  /** Fail closed: a draft without an organization is never visible to an employer. */
  private employerOwns(actor: Actor, draft: StoredDraft): boolean {
    return draft.input.employerOrgId !== undefined && draft.input.employerOrgId === actor.employerOrgId;
  }

  private requireEmployerOrganization(actor: Actor, draft: StoredDraft): void {
    if (!this.employerOwns(actor, draft)) {
      throw new ApplicationError("This submission belongs to another employer organization.", 403, "forbidden");
    }
  }

  private approvalCovers(decision: Decision | undefined, evidenceIds: readonly string[]): boolean {
    return decision !== undefined && evidenceKey(decision.evidenceIds) === evidenceKey(evidenceIds);
  }

  private draftView(draft: StoredDraft): DraftView {
    const documents = generateDocuments({
      vacancyTitle: draft.input.vacancyTitle,
      evidence: draft.input.evidence,
      selectedIds: draft.selectedEvidenceIds,
      match: draft.input.match,
    });
    const view: DraftView = {
      draftId: draft.id,
      candidateId: draft.input.candidateId,
      vacancyId: draft.input.vacancyId,
      employerOrgId: draft.input.employerOrgId,
      traceId: draft.input.traceId,
      vacancyTitle: draft.input.vacancyTitle,
      candidateDisplayName: draft.input.candidateDisplayName,
      evidence: draft.input.evidence.filter((item) => draft.selectedEvidenceIds.includes(item.id)),
      status: draft.status,
      documents,
      counselorGate: this.counselorGate(draft),
      candidateApproved: draft.candidateApproval !== undefined,
      counselorApproved: draft.counselorApproval !== undefined,
      history: draft.history.map(({ actorRole, timestamp, reason, action }) => ({ actorRole, timestamp, reason, action })),
    };
    this.guard(view);
    return view;
  }

  private submitView(submission: StoredSubmission, replayed: boolean): SubmitView {
    const draft = this.draftById(submission.draftId);
    const approved = this.draftView(draft);
    const view: SubmitView = {
      submissionId: submission.id,
      draftId: submission.draftId,
      replayed,
      interview: submission.interview,
      employerOrgId: draft.input.employerOrgId,
      traceId: draft.input.traceId,
      vacancyTitle: draft.input.vacancyTitle,
      documents: approved.documents,
      evidence: approved.evidence,
      history: submission.history.map(({ actorRole, timestamp, reason, action }) => ({ actorRole, timestamp, reason, action })),
    };
    this.guard(view);
    return view;
  }

  private fingerprint(draft: StoredDraft): string {
    return createHash("sha256")
      .update(
        JSON.stringify({
          draftId: draft.id,
          candidateId: draft.ownerId,
          evidenceIds: draft.selectedEvidenceIds,
          decisionId: draft.input.match.decisionId,
        }),
      )
      .digest("hex");
  }

  private audit(actor: Actor, action: AuditEvent["action"], input: ActionInput): void {
    const event: AuditEvent = {
      eventId: this.ids(),
      traceId: input.traceId,
      idempotencyKey: input.idempotencyKey,
      actor: actor.id,
      role: actor.role,
      action,
      reason: input.reason,
      timestamp: this.clock(),
    };
    this.guard(event);
    assertAuditEvent(event);
    this.events.push(event);
  }

  private guard(value: unknown): void {
    assertNoSecrets(value, this.secrets);
  }
}

function evidenceKey(ids: readonly string[]): string {
  return [...ids].sort().join("\n");
}
