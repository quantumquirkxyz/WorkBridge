import type {
  CandidateSkillSignal,
  SkillLevel,
  SolverCandidate,
  SolverVacancy,
  VacancyRequirement,
} from "./types";
import { clampScore } from "./weights";

/** Desirable requirements contribute half of a mandatory requirement. */
export const DESIRABLE_FACTOR = 0.5;

/** Evidence records that saturate the experience dimension. */
export const EVIDENCE_SATURATION = 6;

export interface DimensionScore {
  rawScore: number;
  reasons: string[];
}

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

/** Effective required level, defaulting to 1 when the vacancy left it unset. */
export function effectiveRequiredLevel(requirement: VacancyRequirement): number {
  return requirement.requiredLevel > 0 ? requirement.requiredLevel : 1;
}

/** Highest demonstrated level for a canonical skill; 0 when nothing is demonstrated. */
export function requirementLevel(candidate: SolverCandidate, skillId: string): SkillLevel {
  return bestSkillSignal(candidate.skills, skillId)?.level ?? 0;
}

/** Highest demonstrating signal for a canonical skill, or `undefined`. */
export function bestSkillSignal(
  skills: readonly CandidateSkillSignal[],
  skillId: string,
): CandidateSkillSignal | undefined {
  let best: CandidateSkillSignal | undefined;
  for (const skill of skills) {
    if (skill.skillId !== skillId) continue;
    if (best === undefined || skill.level > best.level) best = skill;
  }
  return best;
}

/**
 * Technical fit: how much of the mandatory (full weight) and desirable (half
 * weight) requirement profile the candidate demonstrates. Requirements without
 * a canonical skill cannot be scored here and are handled as a hard constraint.
 */
export function technicalScore(
  candidate: SolverCandidate,
  vacancy: SolverVacancy,
): DimensionScore {
  const reasons: string[] = [];
  const mandatory = vacancy.mandatory.filter((req) => req.skillId !== null);
  const desirable = vacancy.desirable.filter((req) => req.skillId !== null);

  let numerator = 0;
  let denominator = 0;
  const missingMandatory: string[] = [];

  for (const requirement of mandatory) {
    const level = requirementLevel(candidate, requirement.skillId!);
    const required = effectiveRequiredLevel(requirement);
    const fraction = clamp01(level / required);
    numerator += fraction * required;
    denominator += required;
    if (fraction < 1) missingMandatory.push(requirement.wording);
  }

  for (const requirement of desirable) {
    const level = requirementLevel(candidate, requirement.skillId!);
    const required = effectiveRequiredLevel(requirement);
    const fraction = clamp01(level / required);
    numerator += DESIRABLE_FACTOR * fraction * required;
    denominator += DESIRABLE_FACTOR * required;
  }

  const rawScore = denominator > 0 ? clampScore((numerator / denominator) * 100) : 100;

  if (missingMandatory.length > 0) {
    reasons.push(`Missing mandatory skills: ${missingMandatory.join(", ")}.`);
  }
  if (mandatory.length > 0 && missingMandatory.length === 0) {
    reasons.push("All mapped mandatory skills are met at the required level.");
  }
  if (desirable.length > 0) {
    reasons.push(`${desirable.length} desirable skill(s) considered at half weight.`);
  }
  if (denominator === 0) {
    reasons.push("No mapped skill requirements; technical fit is not restrictive.");
  }

  return { rawScore, reasons };
}

/** Experience and evidence depth, weighted by demonstrated level. */
export function experienceScore(candidate: SolverCandidate): DimensionScore {
  const levelPart = (candidate.experienceLevel / 4) * 70;
  const evidencePart =
    Math.min(1, candidate.relevantEvidenceCount / EVIDENCE_SATURATION) * 30;
  const rawScore = clampScore(levelPart + evidencePart);
  const reasons = [
    `Experience level ${candidate.experienceLevel}/4 with ${candidate.relevantEvidenceCount} relevant evidence record(s).`,
  ];
  return { rawScore, reasons };
}

function overlapMinutes(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): number {
  const start = Math.max(aStart, bStart);
  const end = Math.min(aEnd, bEnd);
  return Math.max(0, end - start);
}

export interface ScheduleCoverage {
  /** Fraction of the vacancy's weekly window the candidate covers, 0–1. */
  coverage: number;
  missingDays: number[];
  /** Weekly minutes the candidate cannot cover. */
  uncoveredMinutes: number;
}

/** Weekly window coverage shared by the availability score and its constraint. */
export function scheduleCoverage(
  candidate: SolverCandidate,
  vacancy: SolverVacancy,
): ScheduleCoverage {
  const availability = candidate.availability;
  const schedule = vacancy.schedule;
  const perDayMinutes = Math.max(0, schedule.endMinute - schedule.startMinute);
  const vacancyMinutes = schedule.days.length * perDayMinutes;

  let covered = 0;
  const missingDays: number[] = [];
  for (const day of schedule.days) {
    if (!availability.days.includes(day)) {
      missingDays.push(day);
      continue;
    }
    covered += overlapMinutes(
      availability.startMinute,
      availability.endMinute,
      schedule.startMinute,
      schedule.endMinute,
    );
  }

  const coverage = vacancyMinutes > 0 ? clamp01(covered / vacancyMinutes) : 1;
  return {
    coverage,
    missingDays,
    uncoveredMinutes: Math.max(0, Math.round(vacancyMinutes - covered)),
  };
}

/**
 * Availability fit: fraction of the vacancy's weekly window the candidate can
 * cover, plus headroom between the candidate's and the vacancy's weekly hours.
 */
export function availabilityScore(
  candidate: SolverCandidate,
  vacancy: SolverVacancy,
): DimensionScore {
  const { coverage, missingDays } = scheduleCoverage(candidate, vacancy);
  const schedule = vacancy.schedule;
  const headroom =
    schedule.weeklyHours > 0
      ? clamp01((candidate.availability.weeklyHours - schedule.weeklyHours) / schedule.weeklyHours)
      : 1;

  const rawScore = clampScore(70 * coverage + 30 * headroom);
  const reasons: string[] = [
    `Schedule coverage ${(coverage * 100).toFixed(0)}% with ${(headroom * 100).toFixed(0)}% hours headroom.`,
  ];
  if (missingDays.length > 0) {
    reasons.push(`Unavailable on weekday(s): ${missingDays.join(", ")}.`);
  }
  return { rawScore, reasons };
}

/**
 * Transport fit: a comfortable commute scores high, a commute at the limit
 * scores lower, and an inaccessible or over-limit route scores zero. The hard
 * constraints (enforced separately) decide aptitude.
 */
export function transportScore(
  commuteMinutes: number,
  maxCommuteMinutes: number,
  accessible: boolean,
): DimensionScore {
  if (!accessible) {
    return {
      rawScore: 0,
      reasons: ["The route does not satisfy the candidate's accessibility needs."],
    };
  }
  if (maxCommuteMinutes <= 0) {
    return { rawScore: 0, reasons: ["No acceptable commute budget was provided."] };
  }
  const ratio = commuteMinutes / maxCommuteMinutes;
  const rawScore = clampScore(100 - 55 * ratio);
  const reasons = [
    `Commute ${Math.round(commuteMinutes)} min against a ${maxCommuteMinutes} min limit.`,
  ];
  return { rawScore, reasons };
}

/**
 * Salary fit: full marks when the vacancy reaches the candidate's expectation,
 * a proportional score between the floor and the expectation, and zero when the
 * vacancy cannot even meet the floor (also a hard-constraint failure).
 */
export function salaryScore(
  candidate: SolverCandidate,
  vacancy: SolverVacancy,
): DimensionScore {
  const expected = candidate.expectedSalaryUsd;
  const floor = candidate.minimumSalaryUsd ?? expected;
  const reasons: string[] = [];

  if (expected <= floor || vacancy.salaryMaxUsd >= expected) {
    reasons.push("Vacancy salary meets the candidate's expectation.");
    return { rawScore: 100, reasons };
  }

  if (vacancy.salaryMaxUsd < floor) {
    reasons.push("Vacancy salary is below the candidate's floor.");
    return { rawScore: 0, reasons };
  }

  const span = expected - floor;
  const rawScore =
    span <= 0 ? 100 : clampScore((60 + 40 * (vacancy.salaryMaxUsd - floor) / span));
  reasons.push("Vacancy salary is between the candidate's floor and expectation.");
  return { rawScore, reasons };
}
