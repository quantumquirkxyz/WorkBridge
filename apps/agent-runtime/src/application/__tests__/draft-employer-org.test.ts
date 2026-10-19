import { describe, expect, it, vi } from "vitest";
import { sampleMatchDecision, sampleWorkflowEnvelope } from "../fixtures";
import { signBetterAuthSession } from "../roles";
import { ApplicationService } from "../service";
import type { ApplicationDecisionSource } from "../shortlist";

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
): ApplicationDecisionSource {
  return {
    isKnownVacancy: known,
    ownerOf: owner,
    decisionFor: vi.fn(async (candidateId, vacancyId) => ({
      kind: "decision" as const,
      evidence: [],
      biasBlocked: false,
      decision: sampleMatchDecision({ traceId: "trusted", candidateId, vacancyId, total: 80 }),
    })),
  };
}

function service(seam?: ApplicationDecisionSource) {
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
  it("uses persisted credential status instead of a forged request-body status", async () => {
    const source = shortlist((id) => (id === "vac-1" ? "org-owner" : undefined));
    source.decisionFor = vi.fn(async (candidateId, vacancyId) => ({
      kind: "decision" as const,
      biasBlocked: false,
      evidence: [{ id: "cert-1", kind: "certification" as const, text: "Certificación persistida", credentialStatus: "unverified" as const }],
      decision: sampleMatchDecision({ traceId: "trusted", candidateId, vacancyId, gaps: [], biasAlerts: [], transport: { feasible: true, source: "google_maps" } }),
    }));
    const app = service(source);
    const draft = await app.createDraft(session("candidate"), draftBody({
      evidence: [{ id: "cert-1", kind: "certification", text: "Certificación falsa", credentialStatus: "verified" }],
    }));
    expect(draft.counselorGate).toEqual([{ code: "unverified_credential", detail: "cert-1" }]);
  });

  it.each(["critical_gap", "bias_alert", "infeasible_transport"])("derives the trusted %s gate reason", async (code) => {
    const source = shortlist((id) => (id === "vac-1" ? "org-owner" : undefined));
    source.decisionFor = vi.fn(async (candidateId, vacancyId) => ({
      kind: "decision" as const,
      biasBlocked: false,
      evidence: [],
      decision: sampleMatchDecision({
        traceId: "trace-ownership", candidateId, vacancyId,
        gaps: code === "critical_gap" ? [{ id: "critical", severity: "critical", description: "Falta un requisito" }] : [],
        biasAlerts: code === "bias_alert" ? [{ id: "bias", reason: "Alerta de sesgo" }] : [],
        transport: { feasible: code !== "infeasible_transport", source: "google_maps" },
      }),
    }));
    const draft = await service(source).createDraft(session("candidate"), draftBody());
    expect(draft.counselorGate.map((reason) => reason.code)).toContain(code);
  });

  it("turns a trusted counterfactual block into a bias gate", async () => {
    const source = shortlist((id) => (id === "vac-1" ? "org-owner" : undefined));
    source.decisionFor = vi.fn(async () => ({ kind: "blocked" as const }));
    const draft = await service(source).createDraft(session("candidate"), draftBody());
    expect(draft.counselorGate).toEqual([{ code: "bias_alert", detail: "Counterfactual audit blocked this vacancy." }]);
  });

  it("uses the trusted match for generated documents when the body match is clean", async () => {
    const source = shortlist((id) => (id === "vac-1" ? "org-owner" : undefined));
    source.decisionFor = vi.fn(async (candidateId, vacancyId) => ({
      kind: "decision" as const,
      biasBlocked: false,
      evidence: [],
      decision: sampleMatchDecision({
        traceId: "trusted", candidateId, vacancyId,
        gaps: [{ id: "critical", severity: "critical", description: "Trusted gap" }],
        biasAlerts: [],
      }),
    }));
    const draft = await service(source).createDraft(session("candidate"), draftBody({
      match: sampleMatchDecision({ traceId: "trace-ownership", candidateId: "candidate", vacancyId: "vac-1", gaps: [], biasAlerts: [] }),
    }));
    expect(draft.documents.application.map((fragment) => fragment.text)).toContain("Brecha señalada por el matching: Trusted gap");
  });

  it("requires counselor approval before submitting a trusted gated draft", async () => {
    const source = shortlist((id) => (id === "vac-1" ? "org-owner" : undefined));
    source.decisionFor = vi.fn(async (candidateId, vacancyId) => ({
      kind: "decision" as const,
      biasBlocked: false,
      evidence: [],
      decision: sampleMatchDecision({ traceId: "trace-ownership", candidateId, vacancyId, gaps: [{ id: "critical", severity: "critical", description: "Trusted gap" }] }),
    }));
    const app = service(source);
    const candidate = session("candidate");
    const draft = await app.createDraft(candidate, draftBody());
    const action = (idempotencyKey: string) => ({ traceId: draft.traceId, idempotencyKey, reason: "Confirmo", envelope: sampleWorkflowEnvelope(draft.traceId, idempotencyKey) });
    app.approveDraft(candidate, draft.draftId, action("idem-candidate"));
    await expect(app.submit(candidate, draft.draftId, action("idem-submit"))).rejects.toMatchObject({ code: "counselor_approval_required" });
  });

  it("stamps the catalog owner on a draft that omits employerOrgId (UI-shaped request)", async () => {
    const app = service(shortlist((id) => (id === "vac-1" ? "org-owner" : undefined)));
    const draft = await app.createDraft(session("candidate"), draftBody(uiShapedDraft));
    expect(draft.employerOrgId).toBe("org-owner");
  });

  it("overrides an employerOrgId claimed in the body for a catalog vacancy", async () => {
    const app = service(shortlist((id) => (id === "vac-1" ? "org-owner" : undefined)));
    const draft = await app.createDraft(session("candidate"), draftBody({ employerOrgId: "org-attacker" }));
    expect(draft.employerOrgId).toBe("org-owner");
  });

  it("refuses a known vacancy without a resolvable owner", async () => {
    const app = service(shortlist(() => undefined, (id) => id === "vac-1"));
    await expect(app.createDraft(session("candidate"), draftBody({ employerOrgId: "org-manual" }))).rejects.toThrowError(
      expect.objectContaining({ status: 503, code: "ownership_unavailable" }),
    );
  });

  it("drops the body employerOrgId when the trusted source marks the vacancy not applicable", async () => {
    const app = service(shortlist(() => undefined));
    const draft = await app.createDraft(session("candidate"), draftBody({ employerOrgId: "org-manual" }));
    expect(draft.employerOrgId).toBeUndefined();
  });

  it("keeps the body employerOrgId when no shortlist seam is configured", () => {
    const app = service();
    const draft = app.createDraftSync(session("candidate"), draftBody({ employerOrgId: "org-manual" }));
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
    const draft = await app.createDraft(candidate, draftBody(uiShapedDraft));
    app.approveDraft(candidate, draft.draftId, action("idem-approve"));
    await app.submit(candidate, draft.draftId, action("idem-submit"));

    const owning = await app.shortlistForVacancy(session("employer", "owner", "org-owner"), "vac-1");
    expect(owning).toHaveLength(1);

    await expect(
      app.shortlistForVacancy(session("employer", "foreign", "org-other"), "vac-1"),
    ).rejects.toMatchObject({ status: 403 });
  });
});
