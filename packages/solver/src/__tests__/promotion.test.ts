import { describe, expect, it } from "vitest";
import { evaluateMatch } from "../match";
import { applyPromotion, resolvePromotion } from "../promotion";
import type { SolverCandidate, SolverVacancy } from "../types";
import { loadFixture } from "../../test/load-fixture";
import { constantRouter } from "../../test/routing";

const metro = loadFixture<SolverVacancy>("vacancies/metro-support.json");
const strong = loadFixture<SolverCandidate>("candidates/strong.json");

const now = () => new Date("2026-10-16T12:00:00.000Z");

const boundary: SolverCandidate = {
  candidateId: "cand-boundary",
  home: strong.home,
  skills: [
    { skillId: "PA-OFF-0002", level: 2, source: "extracted", evidenceCount: 1, confidence: 0.8 },
    { skillId: "PA-CS-0001", level: 2, source: "extracted", evidenceCount: 1, confidence: 0.8 },
    { skillId: "PA-LANG-0002", level: 1, source: "declared", evidenceCount: 1, confidence: 0.6 },
  ],
  experienceLevel: 2,
  relevantEvidenceCount: 3,
  availability: { days: [1, 2, 3, 4, 5], startMinute: 480, endMinute: 1020, weeklyHours: 45 },
  transport: { hasVehicle: false, maxCommuteMinutes: 60, modes: ["transit"] },
  expectedSalaryUsd: 700,
  minimumSalaryUsd: 600,
};

const lower: SolverCandidate = {
  ...boundary,
  candidateId: "cand-lower",
  experienceLevel: 1,
  relevantEvidenceCount: 1,
};

const route49 = constantRouter({ commuteMinutes: 49 });

describe("resolvePromotion", () => {
  it("ignores a score outside the promotion band", () => {
    const outcome = resolvePromotion({
      baseScore: 80,
      hasFailedConstraints: false,
      peerScores: [],
      approved: true,
    });
    expect(outcome.score).toBe(80);
    expect(outcome.promotion.eligible).toBe(false);
  });

  it("refuses to promote when a hard constraint is violated", () => {
    const outcome = resolvePromotion({
      baseScore: 74,
      hasFailedConstraints: true,
      peerScores: [],
      approved: true,
    });
    expect(outcome.promotion.eligible).toBe(false);
    expect(outcome.promotion.reason).toContain("hard constraint");
  });

  it("requires peer evidence before considering a promotion", () => {
    const outcome = resolvePromotion({
      baseScore: 74,
      hasFailedConstraints: false,
      peerScores: undefined,
      approved: true,
    });
    expect(outcome.promotion.eligible).toBe(false);
    expect(outcome.promotion.reason).toContain("no better eligible candidate");
  });

  it("is ineligible when a better eligible candidate exists", () => {
    const outcome = resolvePromotion({
      baseScore: 74,
      hasFailedConstraints: false,
      peerScores: [80, 90],
      approved: true,
    });
    expect(outcome.promotion.eligible).toBe(false);
    expect(outcome.promotion.applied).toBe(false);
  });

  it("is eligible but awaits human approval", () => {
    const outcome = resolvePromotion({
      baseScore: 74,
      hasFailedConstraints: false,
      peerScores: [67, 40],
      approved: false,
    });
    expect(outcome.promotion.eligible).toBe(true);
    expect(outcome.promotion.applied).toBe(false);
    expect(outcome.promotion.requiresHumanApproval).toBe(true);
  });

  it("applies the one-point promotion once approved", () => {
    const outcome = resolvePromotion({
      baseScore: 74,
      hasFailedConstraints: false,
      peerScores: [67],
      approved: true,
    });
    expect(outcome.score).toBe(75);
    expect(outcome.aptitude).toBe("apt");
    expect(outcome.promotion.applied).toBe(true);
  });

  it("can lift the 49 boundary to apt_with_gaps", () => {
    const outcome = resolvePromotion({
      baseScore: 49,
      hasFailedConstraints: false,
      peerScores: [],
      approved: true,
    });
    expect(outcome.score).toBe(50);
    expect(outcome.aptitude).toBe("apt_with_gaps");
  });
});

describe("evaluateMatch promotion integration", () => {
  it("keeps the base score in the promotion band without peer evidence", async () => {
    const decision = await evaluateMatch(boundary, metro, { now, routing: route49 });
    expect(decision.baseScore).toBe(74);
    expect(decision.aptitude).toBe("apt_with_gaps");
    expect(decision.promotion.eligible).toBe(false);
  });

  it("blocks promotion when a stronger peer is eligible", async () => {
    const peer = await evaluateMatch(strong, metro, { now, routing: route49 });
    const decision = await evaluateMatch(boundary, metro, {
      now,
      routing: route49,
      peers: [peer],
    });
    expect(decision.promotion.eligible).toBe(false);
    expect(decision.promotion.reason).toContain("better eligible candidate");
  });

  it("promotes the boundary candidate when no better peer exists and a human approves", async () => {
    const peer = await evaluateMatch(lower, metro, { now, routing: route49 });
    const decision = await evaluateMatch(boundary, metro, {
      now,
      routing: route49,
      peers: [peer],
      approval: {
        candidateId: "cand-boundary",
        vacancyId: metro.vacancyId,
        approved: true,
        reviewer: "counselor@puente.pa",
      },
    });
    expect(decision.promotion.applied).toBe(true);
    expect(decision.score).toBe(75);
    expect(decision.aptitude).toBe("apt");
    expect(decision.reasons).toContain(decision.promotion.reason);
  });

  it("requires approval when the candidate is only eligible", async () => {
    const peer = await evaluateMatch(lower, metro, { now, routing: route49 });
    const decision = await evaluateMatch(boundary, metro, {
      now,
      routing: route49,
      peers: [peer],
    });
    expect(decision.promotion.eligible).toBe(true);
    expect(decision.promotion.requiresHumanApproval).toBe(true);
    expect(decision.score).toBe(74);
  });

  it("does not duplicate the promotion reason when re-applied", async () => {
    const peer = await evaluateMatch(lower, metro, { now, routing: route49 });
    const once = await evaluateMatch(boundary, metro, {
      now,
      routing: route49,
      peers: [peer],
      approval: {
        candidateId: "cand-boundary",
        vacancyId: metro.vacancyId,
        approved: true,
        reviewer: "counselor@puente.pa",
      },
    });
    const twice = applyPromotion(once, { peerScores: [67], approved: true });
    const occurrences = twice.reasons.filter(
      (reason) => reason === once.promotion.reason,
    ).length;
    expect(occurrences).toBe(1);
  });
});
