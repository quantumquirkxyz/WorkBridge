import { describe, expect, it, vi } from "vitest";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { createApplicationServer } from "../server";
import { sampleMatchDecision, sampleWorkflowEnvelope } from "../fixtures";
import { signBetterAuthSession } from "../roles";
import { ApplicationService } from "../service";
import { createApplicationDecisionSource, type ApplicationDecisionSource } from "../shortlist";
import preferencesFixture from "../../../../../packages/catalog/fixtures/preferences.json";
import { candidateProfile } from "../../matching/__tests__/helpers";
import { makeCandidateId } from "@workbridge/domain";

const NOW = "2026-10-16T18:00:00.000Z";
const SECRET = "shortlist-test-secret";

function session(role: "candidate" | "employer" | "counselor", id = role as string, org = "org-owner") {
  return signBetterAuthSession({
    session: { id: `session-${id}`, userId: id, expiresAt: "2027-01-01T00:00:00.000Z" },
    user: { id, email: `${id}@example.test`, role, ...(role === "employer" ? { employerOrgId: org } : {}) },
  }, SECRET);
}

function setup() {
  const decisionFor = vi.fn<ApplicationDecisionSource["decisionFor"]>().mockImplementation(async (candidateId, vacancyId) => ({
    kind: "decision" as const,
    biasBlocked: false,
    decision: sampleMatchDecision({
      traceId: "trusted-ranking",
      candidateId, vacancyId,
      total: candidateId === "strong" ? 90 : 60,
      aptitude: candidateId === "strong" ? "apt" : "apt_with_gaps",
      gaps: [{ id: "gap-1", severity: "minor", description: "Practicar Excel" }],
      biasAlerts: [{ id: "advisory", reason: "Revisar requisito de la vacante" }],
    }),
  }));
  const source: ApplicationDecisionSource = { isKnownVacancy: (id) => id === "vac-1" || id === "foreign-vacancy", ownerOf: (id) => id === "vac-1" ? "org-owner" : id === "foreign-vacancy" ? "org-other" : undefined, decisionFor: decisionFor };
  const app = new ApplicationService({ clock: () => NOW, sessionSecret: SECRET, shortlist: source });
  return { app, decisionFor };
}

async function submit(app: ApplicationService, candidateId: string, org = "org-owner", vacancyId = "vac-1") {
  const traceId = `trace-${candidateId}-${vacancyId}`;
  const candidate = session("candidate", candidateId);
  const action = (key: string) => ({
    traceId, idempotencyKey: `${key}-${traceId}`, reason: "Confirmo",
    envelope: sampleWorkflowEnvelope(traceId, `${key}-${traceId}`),
  });
  const draft = await app.createDraft(candidate, {
    ...action("draft"), candidateId, vacancyId, vacancyTitle: "Auxiliar", employerOrgId: org,
    evidence: [{ id: "ev-1", kind: "experience", text: "Trabajé con Excel", credentialStatus: "not_applicable" }],
    // Deliberately inverted client scores must have no effect on the trusted shortlist.
    match: sampleMatchDecision({ traceId, candidateId, vacancyId, total: candidateId === "strong" ? 80 : 100 }),
  });
  await app.approveDraft(candidate, draft.draftId, action("approve"));
  await app.approveDraft(session("counselor"), draft.draftId, action("counselor-approve"));
  return app.submit(candidate, draft.draftId, action("submit"));
}

describe("employer vacancy shortlist", async () => {
  it("ranks received submissions by trusted scores and returns gaps and bias alerts deterministically", async () => {
    const { app } = setup();
    await submit(app, "weak");
    await submit(app, "strong");
    const first = await app.shortlistForVacancy(session("employer"), "vac-1");
    expect(first.map((entry) => entry.rank)).toEqual([1, 2]);
    expect(first.every((entry) => !("candidateId" in entry))).toBe(true);
    expect(first.map((entry) => entry.score)).toEqual([90, 60]);
    expect(first[0]).toMatchObject({ gapSummary: ["Practicar Excel"], biasAlerts: [{ id: "advisory", reason: "Revisar requisito de la vacante" }] });
    expect(await app.shortlistForVacancy(session("employer"), "vac-1")).toEqual(first);
  });

  it("fails closed on foreign ownership even when a candidate claims the caller's organization", async () => {
    const { app, decisionFor } = setup();
    await submit(app, "weak", "org-owner", "foreign-vacancy");
    decisionFor.mockClear();
    await expect(app.shortlistForVacancy(session("employer"), "foreign-vacancy")).rejects.toMatchObject({ status: 403 });
    await expect(app.shortlistForVacancy(session("candidate"), "vac-1")).rejects.toMatchObject({ status: 403 });
    await expect(app.shortlistForVacancy(session("employer", "other", "org-other"), "vac-1")).rejects.toMatchObject({ status: 403 });
    expect(decisionFor).not.toHaveBeenCalled();
  });

  it("excludes a bias-blocked vacancy from the entire shortlist", async () => {
    const { app, decisionFor } = setup();
    await submit(app, "strong");
    await submit(app, "weak");
    decisionFor.mockResolvedValueOnce({ kind: "decision" as const, biasBlocked: false, decision: sampleMatchDecision({ traceId: "trusted", candidateId: "strong", total: 90 }) });
    decisionFor.mockResolvedValueOnce({ kind: "blocked" as const });
    expect(await app.shortlistForVacancy(session("employer"), "vac-1")).toEqual([]);
  });

  it("breaks score ties by candidate id, independent of submission order", async () => {
    const { app, decisionFor } = setup();
    decisionFor.mockImplementation(async (candidateId, vacancyId) => ({
      kind: "decision" as const,
      biasBlocked: false,
      decision: sampleMatchDecision({ traceId: "tie", candidateId, vacancyId, total: 70 }),
    }));
    await submit(app, "zed");
    const alpha = await submit(app, "alpha");
    const ranked = await app.shortlistForVacancy(session("employer"), "vac-1");
    expect(ranked.map((entry) => entry.score)).toEqual([70, 70]);
    // Candidate id "alpha" sorts before "zed" even though it was submitted second.
    expect(ranked[0]?.submissionId).toBe(alpha.submissionId);
  });

  it("returns an empty shortlist when the owned vacancy has no applications", async () => {
    expect(await setup().app.shortlistForVacancy(session("employer"), "vac-1")).toEqual([]);
  });

  it("serves ranked submissions over HTTP and enforces 401, 403 and 404", async () => {
    const { app } = setup();
    await submit(app, "weak");
    await submit(app, "strong");
    const server = createApplicationServer({ service: app });
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    try {
      const get = (id: string, role?: "candidate" | "employer", org?: string) => fetch(`${base}/vacancies/${id}/shortlist`, {
        headers: role ? { "x-better-auth-session": JSON.stringify(session(role, role, org)) } : {},
      });
      const own = await get("vac-1", "employer");
      expect(own.status).toBe(200);
      expect((await own.json()).shortlist.map((entry: { score: number }) => entry.score)).toEqual([90, 60]);
      expect((await get("vac-1")).status).toBe(401);
      expect((await get("vac-1", "candidate")).status).toBe(403);
      expect((await get("vac-1", "employer", "org-other")).status).toBe(403);
      expect((await get("unknown", "employer")).status).toBe(404);
    } finally {
      server.close();
      await once(server, "close");
    }
  });
});

describe("server shortlist source", async () => {
  it("loads persisted profile/preferences and recomputes a deterministic match with the existing solver", async () => {
    const profile = candidateProfile();
    profile.candidate_id = makeCandidateId("user");
    const preferences = { ...preferencesFixture, candidate_id: profile.candidate_id };
    const query = vi.fn().mockResolvedValue({ rows: [{ profile, preferences }] });
    const source = createApplicationDecisionSource({ query, env: { AUTH_SEED_ENV: "Staging Demo" }, clock: () => NOW });
    expect(source.ownerOf("lnk-1001")).toBe("employer_org_staging-demo");
    expect(source.ownerOf("unknown")).toBeUndefined();
    const result = await source.decisionFor("user", "lnk-1001");
    expect(query).toHaveBeenCalledWith(expect.stringContaining("candidate_profiles"), [profile.candidate_id]);
    expect(result).toMatchObject({ kind: "decision", biasBlocked: false });
    if (result.kind !== "decision") throw new Error("expected a trusted decision");
    expect(result.decision).toMatchObject({ candidateId: "user", vacancyId: "lnk-1001" });
    expect(await source.decisionFor("user", "lnk-1001")).toEqual(result);
  });

  it("reports why it cannot resolve a trusted decision instead of conflating the causes", async () => {
    const unconfigured = createApplicationDecisionSource({ env: {}, clock: () => NOW });
    expect(await unconfigured.decisionFor("candidate", "lnk-1001")).toEqual({ kind: "unavailable", reason: "not_configured" });
    expect(await unconfigured.decisionFor("candidate", "unknown")).toEqual({ kind: "unavailable", reason: "not_applicable" });
    const query = vi.fn().mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [{
      profile: candidateProfile(), preferences: preferencesFixture,
    }] });
    const stored = createApplicationDecisionSource({ query, env: {}, clock: () => NOW });
    expect(await stored.decisionFor("candidate", "lnk-1001")).toEqual({ kind: "unavailable", reason: "no_profile" });
    await expect(stored.decisionFor("candidate", "lnk-1001")).rejects.toMatchObject({ status: 422 });
  });
});

describe("consumer policy for an unresolvable decision", async () => {
  function withSource(source: ApplicationDecisionSource, candidateId: string) {
    const app = new ApplicationService({ clock: () => NOW, sessionSecret: SECRET, shortlist: source });
    return submit(app, candidateId).then(() => app);
  }

  it("refuses draft creation when trusted persistence is not configured", async () => {
    const source: ApplicationDecisionSource = {
      isKnownVacancy: (id) => id === "vac-1",
      ownerOf: (id) => id === "vac-1" ? "org-owner" : undefined,
      decisionFor: async () => ({ kind: "unavailable", reason: "not_configured" }),
    };
    await expect(submit(new ApplicationService({ clock: () => NOW, sessionSecret: SECRET, shortlist: source }), "weak"))
      .rejects.toMatchObject({ status: 503, code: "decision_unavailable" });
  });

  it("refuses draft creation when the candidate has no persisted profile", async () => {
    const source: ApplicationDecisionSource = {
      isKnownVacancy: (id) => id === "vac-1",
      ownerOf: (id) => id === "vac-1" ? "org-owner" : undefined,
      decisionFor: async () => ({ kind: "unavailable", reason: "no_profile" }),
    };
    await expect(submit(new ApplicationService({ clock: () => NOW, sessionSecret: SECRET, shortlist: source }), "weak"))
      .rejects.toMatchObject({ status: 503, code: "decision_unavailable" });
  });
});
