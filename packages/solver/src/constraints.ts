import type {
  HardConstraintId,
  HardConstraintResult,
  RouteEstimate,
  SolverCandidate,
  SolverVacancy,
} from "./types";
import { effectiveRequiredLevel, requirementLevel, scheduleCoverage } from "./scoring";

export interface ConstraintInput {
  candidate: SolverCandidate;
  vacancy: SolverVacancy;
  routing: RouteEstimate;
}

export interface AccessibilityStatus {
  satisfied: boolean;
  reason: string;
}

/**
 * Shared accessibility check used by both the hard constraint (aptitude) and the
 * transport dimension (score). It is reachable in the default path: the route
 * must report no barrier, and every feature the candidate needs must be one the
 * vacancy's workplace provides.
 */
export function accessibilityStatus(
  candidate: SolverCandidate,
  vacancy: SolverVacancy,
  routing: RouteEstimate,
): AccessibilityStatus {
  if (!routing.accessible) {
    return {
      satisfied: false,
      reason: "No route satisfies the candidate's accessibility needs.",
    };
  }
  const provided = new Set(vacancy.accessibilityRequirements ?? []);
  const unmet = (candidate.transport.accessibilityNeeds ?? []).filter(
    (need) => !provided.has(need),
  );
  if (unmet.length > 0) {
    return {
      satisfied: false,
      reason: `The vacancy does not provide the required accessibility feature(s): ${unmet.join(", ")}.`,
    };
  }
  return {
    satisfied: true,
    reason: "The route and the vacancy's features satisfy the candidate's accessibility needs.",
  };
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
    const required = effectiveRequiredLevel(req);
    const level = requirementLevel(candidate, req.skillId!);
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

  const accessibility = accessibilityStatus(candidate, vacancy, routing);
  results.push({
    id: "geographic_accessibility",
    satisfied: accessibility.satisfied,
    reason: accessibility.reason,
  });

  return results;
}

export function failedConstraintIds(
  results: readonly HardConstraintResult[],
): HardConstraintId[] {
  return results.filter((result) => !result.satisfied).map((result) => result.id);
}
