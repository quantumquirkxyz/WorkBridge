import { ApiClientError } from './api/errors';
import { getCandidateProfile, matchVacancies } from './api/client';
import { evidenceFromProfile, type DraftView, type EvidenceItem, type SubmitView } from './applications-status';

const BASE = '/api/applications';
const JSON_HEADERS = { 'content-type': 'application/json' } as const;

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) throw await ApiClientError.fromResponse(response);
  return (await response.json()) as T;
}

/** The runtime validates this envelope against the workflow schema (same shape the counselor client sends). */
function envelope(traceId: string, idempotencyKey: string) {
  return {
    traceId,
    idempotencyKey,
    agent: 'market_and_matching',
    schemaId: 'https://workbridge.pa/schemas/assumed-match-decision.schema.json',
    guardrails: [{ stage: 'output', allowed: true, code: 'ok' }],
    dqlState: 'validated',
  };
}

async function postAction<T>(
  draft: Pick<DraftView, 'draftId' | 'traceId'>,
  action: 'corrections' | 'approvals' | 'rejections' | 'submissions',
  reason: string,
  extra: Record<string, unknown> = {},
  idempotencyKey: string = crypto.randomUUID(),
): Promise<T> {
  const response = await fetch(`${BASE}/drafts/${encodeURIComponent(draft.draftId)}/${action}`, {
    method: 'POST',
    headers: { ...JSON_HEADERS, 'idempotency-key': idempotencyKey },
    body: JSON.stringify({
      traceId: draft.traceId,
      idempotencyKey,
      reason,
      envelope: envelope(draft.traceId, idempotencyKey),
      ...extra,
    }),
  });
  return readJson<T>(response);
}

export async function getMyCandidateId(): Promise<string> {
  const body = await readJson<{ candidateId?: string }>(await fetch('/api/candidate'));
  if (!body.candidateId) throw new ApiClientError({ status: 401, code: 'unauthenticated', message: 'No candidate session.' });
  return body.candidateId;
}

export async function listMyDrafts(): Promise<DraftView[]> {
  const candidateId = await getMyCandidateId();
  const response = await fetch(`${BASE}/drafts?candidateId=${encodeURIComponent(candidateId)}`);
  return (await readJson<{ drafts: DraftView[] }>(response)).drafts;
}

export async function getDraft(draftId: string): Promise<DraftView> {
  return readJson<DraftView>(await fetch(`${BASE}/drafts/${encodeURIComponent(draftId)}`));
}

export interface CreateDraftInput {
  vacancyId: string;
  vacancyTitle: string;
  employerOrgId?: string;
}

export interface CreatedDraft { draft: DraftView; evidence: EvidenceItem[] }

/**
 * Create the draft from a match: fetches the candidate's own profile (evidence) and the
 * deterministic match decision for the vacancy, then POSTs them to ApplicationService.
 * Nothing is sent to an employer here; the draft is private to the candidate (ADR-0003).
 */
export async function createDraftFromMatch(input: CreateDraftInput): Promise<CreatedDraft> {
  const candidateId = await getMyCandidateId();
  const [profile, matches] = await Promise.all([getCandidateProfile(candidateId), matchVacancies([input.vacancyId])]);
  const match = matches.applicationDecisions.find((decision) => decision.vacancyId === input.vacancyId);
  if (!match) throw new ApiClientError({ status: 404, code: 'not_found', message: 'No match decision for this vacancy.' });
  const evidence = evidenceFromProfile(profile);
  const idempotencyKey = crypto.randomUUID();
  // traceId is required by the match-decision contract, so the draft reuses it verbatim.
  const traceId = match.traceId;
  const response = await fetch(`${BASE}/drafts`, {
    method: 'POST',
    headers: { ...JSON_HEADERS, 'idempotency-key': idempotencyKey },
    body: JSON.stringify({
      traceId,
      idempotencyKey,
      candidateId: match.candidateId,
      vacancyId: input.vacancyId,
      vacancyTitle: input.vacancyTitle,
      employerOrgId: input.employerOrgId,
      evidence,
      match,
      envelope: envelope(traceId, idempotencyKey),
    }),
  });
  return { draft: await readJson<DraftView>(response), evidence };
}

export function correctDraft(draft: Pick<DraftView, 'draftId' | 'traceId'>, includeEvidenceIds: string[]): Promise<DraftView> {
  return postAction<DraftView>(draft, 'corrections', 'Ajusté la evidencia de mi postulación.', { includeEvidenceIds });
}

export function approveDraft(draft: Pick<DraftView, 'draftId' | 'traceId'>): Promise<DraftView> {
  return postAction<DraftView>(draft, 'approvals', 'Revisé y apruebo mi postulación.');
}

export function rejectDraft(draft: Pick<DraftView, 'draftId' | 'traceId'>, reason: string): Promise<DraftView> {
  return postAction<DraftView>(draft, 'rejections', reason);
}

/** `idempotencyKey` must be reused when retrying the same confirmed submission. */
export function submitDraft(draft: Pick<DraftView, 'draftId' | 'traceId'>, idempotencyKey: string): Promise<SubmitView> {
  return postAction<SubmitView>(draft, 'submissions', 'Confirmo el envío de mi postulación.', {}, idempotencyKey);
}
