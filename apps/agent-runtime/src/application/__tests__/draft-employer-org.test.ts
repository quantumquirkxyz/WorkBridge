import { describe, expect, it, vi } from "vitest";
import { sampleMatchDecision, sampleWorkflowEnvelope } from "../fixtures";
import { signBetterAuthSession } from "../roles";
import { ApplicationService } from "../service";
import type { ShortlistSource } from "../shortlist";

const NOW = "2026-10-16T18:00:00.000Z";
const SECRET = "draft-employer-org-test-secret";

function session(role: "candidate" | "employer", id = role as string, org?: string) {
  return signBetterAuthSession(
    {
      session: { id: `session-${id}`, userId: id, expiresAt: "2027-01-01T00:00:00.000Z" },
      user: { id, email: `${id}@example.test`, role, ...(role === "employer" ? { employerOrgId: org } : {}) },
    },
    SECRET,
  );
}

/** The trusted ownership seam: only the catalog knows which organization owns a vacancy. */
function shortlist(
  owner: (vacancyId: string) => string | undefined,
  known: (vacancyId: string) => boolean = (vacancyId) => owner(vacancyId) !== undefined,
): ShortlistSource {
  return {
    isKnownVacancy: known,
    ownerOf: owner,
    match: vi.fn(async (candidateId, vacancyId) => ({
      biasBlocked: false,
      decision: sampleMatchDecision({ traceId: "trusted", candidateId, vacancyId, total: 80 }),
    })),
  };
}

function service(seam?: ShortlistSource) {
  return new ApplicationService({ clock: () => NOW, sessionSecret: SECRET, shortlist: seam });
}

function draftBody(overrides: Record<string, unknown> = {}) {
  const traceId = "trace-ownership";
  return {
    traceId,
    idempotencyKey: "idem-ownership",
    candidateId: "candidate",
    vacancyId: "vac-1",
    vacancyTitle: "Auxiliar administrativo",
    evidence: [{ id: "ev-1", kind: "experience" as const, text: "Trabajé con Excel", credentialStatus: "not_applicable" as const }],
    match: sampleMatchDecision({ traceId, candidateId: "candidate", vacancyId: "vac-1", total: 80 }),
    ...overrides,
    envelope: sampleWorkflowEnvelope(traceId, "idem-ownership"),
  };
}

/** The shape the web UI sends today: no employerOrgId, because the browser never knows it. */
const uiShapedDraft = { employerOrgId: undefined };

describe("draft employer organization comes from the trusted seam", () => {
  it("stamps the catalog owner on a draft that omits employerOrgId (UI-shaped request)", () => {
    const app = service(shortlist((id) => (id === "vac-1" ? "org-owner" : undefined)));
    const draft = app.createDraft(session("candidate"), draftBody(uiShapedDraft));
    expect(draft.employerOrgId).toBe("org-owner");
  });

  it("overrides an employerOrgId claimed in the body for a catalog vacancy", () => {
    const app = service(shortlist((id) => (id === "vac-1" ? "org-owner" : undefined)));
    const draft = app.createDraft(session("candidate"), draftBody({ employerOrgId: "org-attacker" }));
    expect(draft.employerOrgId).toBe("org-owner");
  });

  it("discards a body employerOrgId for a known vacancy without an owner", () => {
    const app = service(shortlist(() => undefined, (id) => id === "vac-1"));
    const draft = app.createDraft(session("candidate"), draftBody({ employerOrgId: "org-manual" }));
    expect(draft.employerOrgId).toBeUndefined();
  });

  it("keeps a body employerOrgId for an unknown non-catalog vacancy", () => {
    const app = service(shortlist(() => undefined, () => false));
    const draft = app.createDraft(session("candidate"), draftBody({ employerOrgId: "org-manual" }));
    expect(draft.employerOrgId).toBe("org-manual");
  });

  it("keeps a body employerOrgId when no shortlist seam is configured", () => {
    const app = service();
    const draft = app.createDraft(session("candidate"), draftBody({ employerOrgId: "org-manual" }));
    expect(draft.employerOrgId).toBe("org-manual");
  });

  it("makes a UI-shaped submission visible to the owning employer and invisible to a foreign one", async () => {
    const app = service(shortlist((id) => (id === "vac-1" ? "org-owner" : undefined)));
    const candidate = session("candidate");
    const action = (key: string) => ({
      traceId: "trace-ownership",
      idempotencyKey: key,
      reason: "Confirmo",
      envelope: sampleWorkflowEnvelope("trace-ownership", key),
    });
    const draft = app.createDraft(candidate, draftBody(uiShapedDraft));
    app.approveDraft(candidate, draft.draftId, action("idem-approve"));
    const submitted = await app.submit(candidate, draft.draftId, action("idem-submit"));

    const owning = await app.shortlistForVacancy(session("employer", "owner", "org-owner"), "vac-1");
    expect(owning).toHaveLength(1);

    await expect(
      app.shortlistForVacancy(session("employer", "foreign", "org-other"), "vac-1"),
    ).rejects.toMatchObject({ status: 403 });

    const employerAction = (key: string) => ({
      ...action(key),
      decision: "approved" as const,
    });
    app.approveInterview(session("employer", "owner", "org-owner"), submitted.submissionId, action("idem-employer-approval"));
    const decided = await app.decideInterview(
      session("employer", "owner", "org-owner"),
      submitted.submissionId,
      employerAction("idem-interview-decision"),
    );
    expect(decided.interview).toBe("approved");
  });
});
