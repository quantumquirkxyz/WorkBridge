import { describe, expect, it } from "vitest";
import { buildBaseDecision, evaluateMatch } from "../match";
import { compareDecisions } from "../ties";
import type { MatchDecision, SolverCandidate, SolverVacancy } from "../types";
import { validateMatchDecision } from "../validate";
import { MATCH_WEIGHTS } from "../weights";
import { loadFixture } from "../../test/load-fixture";
import { constantRouter } from "../../test/routing";

const metro = loadFixture<SolverVacancy>("vacancies/metro-support.json");
const desirableOnly = loadFixture<SolverVacancy>("vacancies/desirable-only.json");
const strong = loadFixture<SolverCandidate>("candidates/strong.json");
const mid = loadFixture<SolverCandidate>("candidates/mid.json");
const weak = loadFixture<SolverCandidate>("candidates/weak.json");
const credentialGap = loadFixture<SolverCandidate>("candidates/credential-gap.json");
const infeasibleTransport = loadFixture<SolverCandidate>("candidates/infeasible-transport.json");
const scheduleConflict = loadFixture<SolverCandidate>("candidates/schedule-conflict.json");

const now = () => new Date("2026-10-16T12:00:00.000Z");
const route20 = constantRouter({ commuteMinutes: 20 });
const route40 = constantRouter({ commuteMinutes: 40 });
const route55 = constantRouter({ commuteMinutes: 55 });

function options(commute: ReturnType<typeof constantRouter>) {
  return { now, routing: commute };
}

describe("evaluateMatch aptitude states", () => {
  it("produces apt for a strong eligible candidate", async () => {
    const decision = await evaluateMatch(strong, metro, options(route20));
    expect(decision.aptitude).toBe("apt");
    expect(decision.score).toBe(87);
    expect(decision.failedConstraints).toEqual([]);
    expect(validateMatchDecision(decision)).toBe(true);
  });

  it("produces apt_with_gaps for a partially matching candidate", async () => {
    const decision = await evaluateMatch(mid, metro, options(route40));
    expect(decision.aptitude).toBe("apt_with_gaps");
    expect(decision.score).toBeGreaterThanOrEqual(50);
    expect(decision.score).toBeLessThanOrEqual(74);
  });

  it("produces not_currently_apt from the score band without a hard failure", async () => {
    const decision = await evaluateMatch(weak, desirableOnly, options(route55));
    expect(decision.aptitude).toBe("not_currently_apt");
    expect(decision.score).toBeLessThan(50);
    expect(decision.failedConstraints).toEqual([]);
  });
});

describe("evaluateMatch hard constraints", () => {
  it("fails on a mandatory credential gap", async () => {
    const decision = await evaluateMatch(credentialGap, metro, options(route20));
    expect(decision.aptitude).toBe("not_currently_apt");
    expect(decision.failedConstraints).toContain("mandatory_skills");
  });

  it("fails on infeasible transport", async () => {
    const decision = await evaluateMatch(infeasibleTransport, metro, options(route20));
    expect(decision.aptitude).toBe("not_currently_apt");
    expect(decision.failedConstraints).toContain("geographic_commute");
  });

  it("fails on a schedule conflict", async () => {
    const decision = await evaluateMatch(scheduleConflict, metro, options(route20));
    expect(decision.aptitude).toBe("not_currently_apt");
    expect(decision.failedConstraints).toContain("schedule");
  });
});

describe("MatchDecision shape", () => {
  it("reports all five dimensions with the confirmed weights", async () => {
    const decision = await evaluateMatch(strong, metro, options(route20));
    expect(decision.scoreBreakdown).toHaveLength(5);
    const totalWeight = decision.scoreBreakdown.reduce(
      (sum, item) => sum + item.weight,
      0,
    );
    expect(totalWeight).toBeCloseTo(1, 10);
    for (const item of decision.scoreBreakdown) {
      expect(item.weight).toBe(MATCH_WEIGHTS[item.dimension]);
      expect(item.weightedScore).toBeCloseTo(
        Number((item.weight * item.rawScore).toFixed(2)),
        5,
      );
    }
  });

  it("keeps score equal to baseScore when no promotion is applied", async () => {
    const decision = await evaluateMatch(strong, metro, options(route20));
    expect(decision.score).toBe(decision.baseScore);
    expect(decision.promotion.applied).toBe(false);
  });

  it("surfaces the routing source and fallback reason in the reasons", async () => {
    const decision = await evaluateMatch(strong, metro, {
      now,
      routing: constantRouter({
        commuteMinutes: 20,
        source: "local_matrix",
        fallbackReason: "Google Maps request failed.",
      }),
    });
    expect(decision.routing.source).toBe("local_matrix");
    expect(decision.reasons.join(" ")).toContain("local matrix");
    expect(decision.reasons.join(" ")).toContain("Google Maps was unavailable");
  });

  it("rejects a malformed decision", async () => {
    const decision = await evaluateMatch(strong, metro, options(route20));
    expect(validateMatchDecision({ ...decision, aptitude: "maybe" })).toBe(false);
    expect(validateMatchDecision({ ...decision, score: 140 })).toBe(false);
  });

  it("builds a base decision whose promotion is not yet evaluated", async () => {
    const base = await buildBaseDecision(strong, metro, options(route20));
    expect(base.promotion.eligible).toBe(false);
    expect(base.promotion.reason).toContain("not evaluated");
  });
});

describe("deterministic tie-breaking and protected-attribute invariance", () => {
  it("orders equal scores by candidate id", async () => {
    const a: SolverCandidate = { ...strong, candidateId: "cand-a" };
    const b: SolverCandidate = { ...strong, candidateId: "cand-b" };
    const first = await evaluateMatch(a, metro, options(route20));
    const second = await evaluateMatch(b, metro, options(route20));
    expect(first.score).toBe(second.score);
    expect(compareDecisions(first, second)).toBeLessThan(0);
    expect(first.tieBreakKey).not.toBe(second.tieBreakKey);
  });

  it("is invariant to protected attributes", async () => {
    const withProtected = {
      ...strong,
      protectedAttributes: { gender: "f", age: 21, ethnicity: "z", maritalStatus: "single" },
    } as unknown as SolverCandidate;
    const baseline = await evaluateMatch(strong, metro, options(route20));
    const mutated = await evaluateMatch(withProtected, metro, options(route20));
    expect(mutated).toEqual(baseline);
  });

  it("is reproducible for repeated evaluations", async () => {
    const first: MatchDecision = await evaluateMatch(mid, metro, options(route40));
    const second = await evaluateMatch(mid, metro, options(route40));
    expect(second).toEqual(first);
  });
});
