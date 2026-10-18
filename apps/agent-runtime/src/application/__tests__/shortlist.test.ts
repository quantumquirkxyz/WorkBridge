import { describe, expect, it, vi } from "vitest";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { createApplicationServer } from "../server";
import { sampleMatchDecision, sampleWorkflowEnvelope } from "../fixtures";
import { signBetterAuthSession } from "../roles";
import { ApplicationService } from "../service";
import { createShortlistSource, type ShortlistSource } from "../shortlist";
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
  const match = vi.fn<ShortlistSource["match"]>().mockImplementation(async (candidateId, vacancyId) => ({
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
  const source: ShortlistSource = { ownerOf: (id) => id === "vac-1" ? "org-owner" : id === "foreign-vacancy" ? "org-other" : undefined, match };
  const app = new ApplicationService({ clock: () => NOW, sessionSecret: SECRET, shortlist: source });
  return { app, match };
}

async function submit(app: ApplicationService, candidateId: string, org = "org-owner", vacancyId = "vac-1") {
  const traceId = `trace-${candidateId}-${vacancyId}`;
  const candidate = session("candidate", candidateId);
  const action = (key: string) => ({
    traceId, idempotencyKey: `${key}-${traceId}`, reason: "Confirmo",
    envelope: sampleWorkflowEnvelope(traceId, `${key}-${traceId}`),
  });
  const draft = app.createDraft(candidate, {
    ...action("draft"), candidateId, vacancyId, vacancyTitle: "Auxiliar", employerOrgId: org,
    evidence: [{ id: "ev-1", kind: "experience", text: "Trabajé con Excel", credentialStatus: "not_applicable" }],
    // Deliberately inverted client scores must have no effect on the trusted shortlist.
    match: sampleMatchDecision({ traceId, candidateId, vacancyId, total: candidateId === "strong" ? 80 : 100 }),
  });
  app.approveDraft(candidate, draft.draftId, action("approve"));
  return app.submit(candidate, draft.draftId, action("submit"));
}

describe("employer vacancy shortlist", () => {
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
    const { app, match } = setup();
    await submit(app, "weak", "org-owner", "foreign-vacancy");
    await expect(app.shortlistForVacancy(session("employer"), "foreign-vacancy")).rejects.toMatchObject({ status: 403 });
    await expect(app.shortlistForVacancy(session("candidate"), "vac-1")).rejects.toMatchObject({ status: 403 });
    await expect(app.shortlistForVacancy(session("employer", "other", "org-other"), "vac-1")).rejects.toMatchObject({ status: 403 });
    expect(match).not.toHaveBeenCalled();
  });

  it("excludes a bias-blocked vacancy from the entire shortlist", async () => {
    const { app, match } = setup();
    await submit(app, "strong");
    await submit(app, "weak");
    match.mockResolvedValueOnce({ biasBlocked: false, decision: sampleMatchDecision({ traceId: "trusted", candidateId: "strong", total: 90 }) });
    match.mockResolvedValueOnce({ biasBlocked: true });
    expect(await app.shortlistForVacancy(session("employer"), "vac-1")).toEqual([]);
  });

  it("breaks score ties by candidate id, independent of submission order", async () => {
    const { app, match } = setup();
    match.mockImplementation(async (candidateId, vacancyId) => ({
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

describe("server shortlist source", () => {
  it("loads persisted profile/preferences and recomputes a deterministic match with the existing solver", async () => {
    const profile = candidateProfile();
    profile.candidate_id = makeCandidateId("user");
    const preferences = { ...preferencesFixture, candidate_id: profile.candidate_id };
    const query = vi.fn().mockResolvedValue({ rows: [{ profile, preferences }] });
    const source = createShortlistSource({ query, env: { AUTH_SEED_ENV: "Staging Demo" }, clock: () => NOW });
    expect(source.ownerOf("lnk-1001")).toBe("employer_org_staging-demo");
    expect(source.ownerOf("unknown")).toBeUndefined();
    const result = await source.match("user", "lnk-1001");
    expect(query).toHaveBeenCalledWith(expect.stringContaining("candidate_profiles"), [profile.candidate_id]);
    expect(result.biasBlocked).toBe(false);
    expect(result.decision).toMatchObject({ candidateId: "user", vacancyId: "lnk-1001" });
    expect(await source.match("user", "lnk-1001")).toEqual(result);
  });

  it("fails closed without persisted data and excludes missing or inconsistent candidate records", async () => {
    const source = createShortlistSource({ env: {}, clock: () => NOW });
    await expect(source.match("candidate", "lnk-1001")).rejects.toMatchObject({ status: 503 });
    const query = vi.fn().mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [{
      profile: candidateProfile(), preferences: preferencesFixture,
    }] });
    const stored = createShortlistSource({ query, env: {}, clock: () => NOW });
    expect(await stored.match("candidate", "lnk-1001")).toEqual({ biasBlocked: false });
    await expect(stored.match("candidate", "lnk-1001")).rejects.toMatchObject({ status: 422 });
  });
});
