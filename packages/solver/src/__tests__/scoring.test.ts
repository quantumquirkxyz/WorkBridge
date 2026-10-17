import { describe, expect, it } from "vitest";
import {
  availabilityScore,
  bestSkillSignal,
  experienceScore,
  salaryScore,
  scheduleCoverage,
  technicalScore,
  transportScore,
} from "../scoring";
import type { SolverCandidate, SolverVacancy } from "../types";
import { MATCH_WEIGHTS, classifyAptitude, weightedScore } from "../weights";
import { loadFixture } from "../../test/load-fixture";

const metro = loadFixture<SolverVacancy>("vacancies/metro-support.json");
const desirableOnly = loadFixture<SolverVacancy>("vacancies/desirable-only.json");
const strong = loadFixture<SolverCandidate>("candidates/strong.json");
const mid = loadFixture<SolverCandidate>("candidates/mid.json");
const weak = loadFixture<SolverCandidate>("candidates/weak.json");
const credentialGap = loadFixture<SolverCandidate>("candidates/credential-gap.json");
const scheduleConflict = loadFixture<SolverCandidate>("candidates/schedule-conflict.json");

describe("weights", () => {
  it("sum to 1 and match the confirmed spec values", () => {
    const total = Object.values(MATCH_WEIGHTS).reduce((sum, weight) => sum + weight, 0);
    expect(total).toBeCloseTo(1, 10);
    expect(MATCH_WEIGHTS).toEqual({
      technical: 0.3,
      experience: 0.25,
      availability: 0.15,
      transport: 0.2,
      salary: 0.1,
    });
  });

  it("classifies aptitude at the exact thresholds", () => {
    expect(classifyAptitude(100)).toBe("apt");
    expect(classifyAptitude(75)).toBe("apt");
    expect(classifyAptitude(74)).toBe("apt_with_gaps");
    expect(classifyAptitude(50)).toBe("apt_with_gaps");
    expect(classifyAptitude(49)).toBe("not_currently_apt");
    expect(classifyAptitude(0)).toBe("not_currently_apt");
  });

  it("clamps and rounds a weighted score", () => {
    expect(
      weightedScore({ technical: 100, experience: 100, availability: 100, transport: 100, salary: 100 }),
    ).toBe(100);
    expect(
      weightedScore({ technical: 0, experience: 0, availability: 0, transport: 0, salary: 0 }),
    ).toBe(0);
    expect(
      weightedScore({ technical: 150, experience: 0, availability: 0, transport: 0, salary: 0 }),
    ).toBe(30);
  });
});

describe("bestSkillSignal", () => {
  it("returns the highest-level matching skill", () => {
    expect(bestSkillSignal(strong.skills, "PA-OFF-0002")?.level).toBe(3);
    expect(bestSkillSignal(strong.skills, "PA-CS-0001")?.level).toBe(3);
    expect(bestSkillSignal(strong.skills, "PA-LANG-0002")?.level).toBe(2);
    expect(bestSkillSignal(strong.skills, "PA-IT-0001")).toBeUndefined();
  });
});

describe("technicalScore", () => {
  it("scores a candidate that meets every mapped requirement at 100", () => {
    expect(technicalScore(strong, metro).rawScore).toBe(100);
  });

  it("scores full mandatory coverage with a partially met desirable profile", () => {
    expect(technicalScore(mid, metro).rawScore).toBe(89);
  });

  it("flags missing mandatory skills in the reasons", () => {
    expect(technicalScore(credentialGap, metro).reasons.join(" ")).toContain(
      "Missing mandatory skills",
    );
  });

  it("scores a candidate with no relevant skills at 0", () => {
    expect(technicalScore(weak, desirableOnly).rawScore).toBe(0);
  });
});

describe("experienceScore", () => {
  it("combines level and evidence depth", () => {
    expect(experienceScore(strong).rawScore).toBe(78);
    expect(experienceScore(mid).rawScore).toBe(50);
    expect(experienceScore(weak).rawScore).toBe(0);
  });
});

describe("scheduleCoverage and availabilityScore", () => {
  it("reports full coverage for a containing window", () => {
    expect(scheduleCoverage(strong, metro).coverage).toBe(1);
    expect(availabilityScore(strong, metro).rawScore).toBe(73);
  });

  it("reports uncovered days and minutes", () => {
    const coverage = scheduleCoverage(scheduleConflict, metro);
    expect(coverage.coverage).toBeCloseTo(0.6, 5);
    expect(coverage.missingDays).toEqual([4, 5]);
    expect(coverage.uncoveredMinutes).toBe(1080);
  });
});

describe("transportScore", () => {
  it("prefers a short commute", () => {
    expect(transportScore(20, 60, true).rawScore).toBe(82);
    expect(transportScore(49, 60, true).rawScore).toBe(55);
  });

  it("returns zero when the route is inaccessible or has no budget", () => {
    expect(transportScore(10, 60, false).rawScore).toBe(0);
    expect(transportScore(10, 0, true).rawScore).toBe(0);
  });
});

describe("salaryScore", () => {
  it("awards full marks when the vacancy meets the expectation", () => {
    expect(salaryScore(strong, metro).rawScore).toBe(100);
  });

  it("scales between the floor and the expectation", () => {
    const candidate: SolverCandidate = {
      ...strong,
      expectedSalaryUsd: 900,
      minimumSalaryUsd: 600,
    };
    expect(salaryScore(candidate, { ...metro, salaryMaxUsd: 800 }).rawScore).toBe(87);
  });

  it("returns zero when the vacancy is below the floor", () => {
    const candidate: SolverCandidate = {
      ...strong,
      expectedSalaryUsd: 900,
      minimumSalaryUsd: 850,
    };
    expect(salaryScore(candidate, { ...metro, salaryMaxUsd: 800 }).rawScore).toBe(0);
  });
});
