import { describe, expect, it } from "vitest";
import { evaluateHardConstraints, failedConstraintIds, salaryFloor } from "../constraints";
import type { RouteEstimate, SolverCandidate, SolverVacancy } from "../types";
import { loadFixture } from "../../test/load-fixture";

const metro = loadFixture<SolverVacancy>("vacancies/metro-support.json");
const strong = loadFixture<SolverCandidate>("candidates/strong.json");
const credentialGap = loadFixture<SolverCandidate>("candidates/credential-gap.json");
const infeasibleTransport = loadFixture<SolverCandidate>("candidates/infeasible-transport.json");
const scheduleConflict = loadFixture<SolverCandidate>("candidates/schedule-conflict.json");

const okRoute: RouteEstimate = {
  commuteMinutes: 20,
  distanceKm: 8,
  accessible: true,
  source: "local_matrix",
};

function evaluate(
  candidate: SolverCandidate,
  vacancy: SolverVacancy = metro,
  routing: RouteEstimate = okRoute,
) {
  return evaluateHardConstraints({ candidate, vacancy, routing });
}

describe("evaluateHardConstraints", () => {
  it("passes every constraint for an eligible pair", () => {
    const results = evaluate(strong);
    expect(results).toHaveLength(7);
    expect(failedConstraintIds(results)).toEqual([]);
  });

  it("fails the mandatory-skill constraint on a credential gap", () => {
    const failed = failedConstraintIds(evaluate(credentialGap));
    expect(failed).toContain("mandatory_skills");
  });

  it("fails geographic feasibility when the commute exceeds the limit", () => {
    const failed = failedConstraintIds(evaluate(infeasibleTransport));
    expect(failed).toContain("geographic_commute");
  });

  it("fails the schedule constraint on a weekday conflict", () => {
    const failed = failedConstraintIds(evaluate(scheduleConflict));
    expect(failed).toContain("schedule");
  });

  it("fails the capacity constraint when there are no openings", () => {
    const failed = failedConstraintIds(evaluate(strong, { ...metro, capacity: 0 }));
    expect(failed).toContain("capacity");
  });

  it("fails the salary constraint below the candidate floor", () => {
    const candidate: SolverCandidate = {
      ...strong,
      expectedSalaryUsd: 900,
      minimumSalaryUsd: 850,
    };
    const failed = failedConstraintIds(evaluate(candidate, { ...metro, salaryMaxUsd: 800 }));
    expect(failed).toContain("salary");
  });

  it("fails when a mandatory requirement is not mapped to a canonical skill", () => {
    const vacancy: SolverVacancy = {
      ...metro,
      mandatory: [
        { requirementId: "req-x", skillId: null, wording: "Don de gente", requiredLevel: 1 },
      ],
    };
    const failed = failedConstraintIds(evaluate(strong, vacancy));
    expect(failed).toContain("mandatory_requirements_mapped");
  });

  it("fails the accessibility constraint when no route fits", () => {
    const failed = failedConstraintIds(
      evaluate(strong, metro, { ...okRoute, accessible: false }),
    );
    expect(failed).toContain("geographic_accessibility");
  });

  it("uses the minimum salary as the floor when provided", () => {
    expect(salaryFloor(strong)).toBe(600);
    expect(salaryFloor({ ...strong, minimumSalaryUsd: undefined })).toBe(700);
  });
});
