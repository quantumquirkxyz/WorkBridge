import type {
  HardConstraintResult,
  RouteEstimate,
  SolverCandidate,
  SolverVacancy,
} from "./types";
import { bestSkillSignal, scheduleCoverage } from "./scoring";

export interface ConstraintInput {
  candidate: SolverCandidate;
  vacancy: SolverVacancy;
  routing: RouteEstimate;
}

/** Effective salary floor: the explicit minimum, else the expectation. */
export function salaryFloor(candidate: SolverCandidate): number {
  return candidate.minimumSalaryUsd ?? candidate.expectedSalaryUsd;
}

/**
 * Evaluate every hard constraint. A failed constraint overrides the weighted
 * score and resolves the decision to `not_currently_apt`. Constraints are
 * returned in a stable order so decisions are deterministic.
 */
export function evaluateHardConstraints({
  candidate,
  vacancy,
  routing,
}: ConstraintInput): HardConstraintResult[] {
  const results: HardConstraintResult[] = [];

  const mappedMandatory = vacancy.mandatory.filter((req) => req.skillId !== null);
  const missingMandatory = mappedMandatory.filter((req) => {
    const required = req.requiredLevel > 0 ? req.requiredLevel : 1;
    const level = bestSkillSignal(candidate.skills, req.skillId!)?.level ?? 0;
    return level < required;
  });
  results.push({
    id: "mandatory_skills",
    satisfied: missingMandatory.length === 0,
    reason:
      missingMandatory.length === 0
        ? "Every mapped mandatory skill is met at the required level."
        : `Mandatory skills not met: ${missingMandatory.map((r) => r.wording).join(", ")}.`,
  });

  const unmappedMandatory = vacancy.mandatory.filter((req) => req.skillId === null);
  results.push({
    id: "mandatory_requirements_mapped",
    satisfied: unmappedMandatory.length === 0,
    reason:
      unmappedMandatory.length === 0
        ? "Every mandatory requirement maps to a canonical skill."
        : `Mandatory requirement(s) could not be evaluated deterministically: ${unmappedMandatory
            .map((r) => r.wording)
            .join(", ")}.`,
  });

  const coverage = scheduleCoverage(candidate, vacancy);
  results.push({
    id: "schedule",
    satisfied: coverage.coverage >= 1,
    reason:
      coverage.coverage >= 1
        ? "The candidate covers the full vacancy schedule."
        : `The candidate cannot cover the vacancy schedule (${coverage.uncoveredMinutes} weekly minute(s) uncovered${
            coverage.missingDays.length > 0
              ? `, unavailable on weekday(s) ${coverage.missingDays.join(", ")}`
              : ""
          }).`,
  });

  const floor = salaryFloor(candidate);
  results.push({
    id: "salary",
    satisfied: vacancy.salaryMaxUsd >= floor,
    reason:
      vacancy.salaryMaxUsd >= floor
        ? "The vacancy salary reaches the candidate's floor."
        : `The vacancy salary (USD ${vacancy.salaryMaxUsd}) is below the candidate's floor (USD ${floor}).`,
  });

  results.push({
    id: "capacity",
    satisfied: vacancy.capacity >= 1,
    reason:
      vacancy.capacity >= 1
        ? `${vacancy.capacity} opening(s) available.`
        : "The vacancy has no openings.",
  });

  results.push({
    id: "geographic_commute",
    satisfied: routing.commuteMinutes <= candidate.transport.maxCommuteMinutes,
    reason:
      routing.commuteMinutes <= candidate.transport.maxCommuteMinutes
        ? `Commute of ${Math.round(routing.commuteMinutes)} min is within the ${candidate.transport.maxCommuteMinutes} min limit.`
        : `Commute of ${Math.round(routing.commuteMinutes)} min exceeds the ${candidate.transport.maxCommuteMinutes} min limit.`,
  });

  results.push({
    id: "geographic_accessibility",
    satisfied: routing.accessible,
    reason: routing.accessible
      ? "The route satisfies the accessibility needs."
      : "No route satisfies the candidate's accessibility needs.",
  });

  return results;
}

export function failedConstraintIds(results: readonly HardConstraintResult[]): string[] {
  return results.filter((result) => !result.satisfied).map((result) => result.id);
}
