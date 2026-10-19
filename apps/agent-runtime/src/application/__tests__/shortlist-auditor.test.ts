import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeCandidateId } from "@workbridge/domain";
import preferencesFixture from "../../../../../packages/catalog/fixtures/preferences.json";
import { candidateProfile } from "../../matching/__tests__/helpers";

const { audit } = vi.hoisted(() => ({ audit: vi.fn() }));
vi.mock("../../bias/audit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../bias/audit")>()),
  auditCounterfactuals: audit,
}));

import { createApplicationDecisionSource } from "../shortlist";

const NOW = "2026-10-16T18:00:00.000Z";
const VACANCY = "lnk-1001";

function source() {
  const profile = candidateProfile();
  profile.candidate_id = makeCandidateId("user");
  const preferences = { ...preferencesFixture, candidate_id: profile.candidate_id };
  const query = vi.fn().mockResolvedValue({ rows: [{ profile, preferences }] });
  return createApplicationDecisionSource({ query, env: {}, clock: () => NOW });
}

describe("shortlist source and the counterfactual auditor", () => {
  beforeEach(() => { audit.mockReset(); });

  it("surfaces the auditor's alerts for the vacancy on the decision, not the vacancy document's", async () => {
    audit.mockImplementation(async ({ baseline }) => ({
      alerts: [
        { id: "bias-lnk-1001-corregimiento", vacancyId: VACANCY, attribute: "corregimiento", reason: "Counterfactual corregimiento changed score band." },
        { id: "bias-other-holder_name", vacancyId: "other", attribute: "holder_name", reason: "Not this vacancy." },
      ],
      blockedVacancyIds: [],
      vacancies: [],
      match: baseline,
    }));
    const result = await source().decisionFor("user", VACANCY);
    expect(result).toMatchObject({ kind: "decision", biasBlocked: false });
    if (result.kind !== "decision") throw new Error("expected a trusted decision");
    expect(result.decision.biasAlerts).toEqual([
      { id: "bias-lnk-1001-corregimiento", reason: "Counterfactual corregimiento changed score band." },
    ]);
  });

  it("reports a vacancy the auditor blocked and returns no decision for it", async () => {
    audit.mockImplementation(async ({ baseline }) => ({
      alerts: [{ id: "bias-lnk-1001-gender_marker", vacancyId: VACANCY, attribute: "gender_marker", reason: "flip" }],
      blockedVacancyIds: [VACANCY],
      vacancies: [],
      match: { ...baseline, result: { ...baseline.result, decisions: [], assignments: [] } },
    }));
    expect(await source().decisionFor("user", VACANCY)).toEqual({ kind: "blocked" });
  });
});
