import { describe, expect, it } from "vitest";
import { nominate } from "../nominate";
import type { SolverCandidate, SolverVacancy } from "../types";
import { loadFixture } from "../../test/load-fixture";
import { constantRouter } from "../../test/routing";

const metro = loadFixture<SolverVacancy>("vacancies/metro-support.json");
const desirableOnly = loadFixture<SolverVacancy>("vacancies/desirable-only.json");
const strong = loadFixture<SolverCandidate>("candidates/strong.json");
const mid = loadFixture<SolverCandidate>("candidates/mid.json");
const weak = loadFixture<SolverCandidate>("candidates/weak.json");

const now = () => new Date("2026-10-16T12:00:00.000Z");
const route20 = constantRouter({ commuteMinutes: 20 });
const route49 = constantRouter({ commuteMinutes: 49 });

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

function key(decision: { candidateId: string; vacancyId: string }): string {
  return `${decision.candidateId}->${decision.vacancyId}`;
}

describe("nominate", () => {
  it("assigns eligible candidates up to capacity using the HiGHS MILP", async () => {
    const result = await nominate({
      candidates: [strong, mid, weak],
      vacancies: [metro],
      now,
      routing: route20,
    });
    expect(result.solver).toBe("highs");
    expect(result.decisions).toHaveLength(3);
    expect(result.assignments.map(key).sort()).toEqual(
      ["cand-strong->vac-metro-support", "cand-mid->vac-metro-support"].sort(),
    );
  });

  it("excludes a candidate that fails a hard constraint", async () => {
    const result = await nominate({
      candidates: [strong, mid, weak],
      vacancies: [metro],
      now,
      routing: route20,
    });
    const weakDecision = result.decisions.find(
      (decision) => decision.candidateId === "cand-weak",
    )!;
    expect(weakDecision.failedConstraints).toContain("mandatory_skills");
    expect(result.assignments.some((decision) => decision.candidateId === "cand-weak")).toBe(
      false,
    );
  });

  it("never exceeds a capacity of one", async () => {
    const result = await nominate({
      candidates: [strong, mid],
      vacancies: [{ ...metro, capacity: 1 }],
      now,
      routing: route20,
    });
    expect(result.assignments).toHaveLength(1);
    expect(result.assignments[0]?.candidateId).toBe("cand-strong");
  });

  it("is deterministic across repeated runs", async () => {
    const problem = {
      candidates: [strong, mid, weak],
      vacancies: [metro, desirableOnly],
      now,
      routing: route20,
    };
    const first = await nominate(problem);
    const second = await nominate(problem);
    expect(second).toEqual(first);
  });

  it("breaks assignment ties by the documented order, independent of input order", async () => {
    const candA: SolverCandidate = { ...boundary, candidateId: "cand-a" };
    const candB: SolverCandidate = { ...boundary, candidateId: "cand-b" };
    const vacancy: SolverVacancy = { ...metro, capacity: 1 };

    const forward = await nominate({
      candidates: [candA, candB],
      vacancies: [vacancy],
      now,
      routing: route49,
    });
    const reverse = await nominate({
      candidates: [candB, candA],
      vacancies: [vacancy],
      now,
      routing: route49,
    });

    expect(forward.assignments.map((decision) => decision.candidateId)).toEqual(["cand-a"]);
    expect(reverse.assignments.map((decision) => decision.candidateId)).toEqual(["cand-a"]);
  });

  it("canonicalizes equal-score assignments to the documented order across vacancies", async () => {
    const candA: SolverCandidate = { ...boundary, candidateId: "cand-a" };
    const candB: SolverCandidate = { ...boundary, candidateId: "cand-b" };
    const vac1: SolverVacancy = { ...metro, vacancyId: "vac-1", capacity: 1 };
    const vac2: SolverVacancy = { ...metro, vacancyId: "vac-2", capacity: 1 };

    const run = (candidates: SolverCandidate[]) =>
      nominate({ candidates, vacancies: [vac1, vac2], now, routing: route49 });

    const forward = await run([candA, candB]);
    const reverse = await run([candB, candA]);
    const expected = ["cand-a->vac-1", "cand-b->vac-2"];
    expect(forward.assignments.map(key).sort()).toEqual(expected);
    expect(reverse.assignments.map(key).sort()).toEqual(expected);
  });

  it("records a fallback when the MILP solver fails", async () => {
    const broken = {
      name: "broken",
      async solve(): Promise<never> {
        throw new Error("no wasm");
      },
    };
    const result = await nominate({
      candidates: [strong, mid],
      vacancies: [metro],
      now,
      routing: route20,
      solver: broken,
    });
    expect(result.solver).toBe("greedy_fallback");
    expect(result.fallbackReason).toBe("no wasm");
    expect(result.assignments.map((decision) => decision.candidateId).sort()).toEqual([
      "cand-mid",
      "cand-strong",
    ]);
  });

  it("applies a promotion only with peer evidence and human approval", async () => {
    const result = await nominate({
      candidates: [boundary, lower],
      vacancies: [metro],
      now,
      routing: route49,
      approvals: [
        {
          candidateId: "cand-boundary",
          vacancyId: metro.vacancyId,
          approved: true,
          reviewer: "counselor@workbridge.pa",
        },
      ],
    });

    const boundaryDecision = result.decisions.find(
      (decision) => decision.candidateId === "cand-boundary",
    )!;
    const lowerDecision = result.decisions.find(
      (decision) => decision.candidateId === "cand-lower",
    )!;

    expect(boundaryDecision.baseScore).toBe(74);
    expect(boundaryDecision.promotion.applied).toBe(true);
    expect(boundaryDecision.score).toBe(75);
    expect(lowerDecision.promotion.eligible).toBe(false);
    expect(result.assignments[0]?.candidateId).toBe("cand-boundary");
  });
});
