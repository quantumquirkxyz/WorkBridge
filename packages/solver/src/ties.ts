import type { MatchDecision } from "./types";

export interface TieBreakParts {
  score: number;
  failedCount: number;
  vacancyId: string;
  candidateId: string;
}

/**
 * Locale-independent string comparison by UTF-16 code unit. `localeCompare`
 * depends on the process locale, so it cannot be used where the ordering must be
 * identical across environments. Returns -1, 0, or 1.
 */
export function compareCodeUnits(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

/**
 * Stable key for a candidate/vacancy pair. Shared by the assignment model, the
 * greedy fallback, and nomination so the format cannot drift between them.
 */
export function pairKey(vacancyId: string, candidateId: string): string {
  return `${vacancyId}|${candidateId}`;
}

/**
 * Deterministic ordering key. It is derived only from the score, the number of
 * failed hard constraints, and the stable vacancy/candidate identifiers — never
 * from protected attributes or randomness.
 */
export function buildTieBreakKey({
  score,
  failedCount,
  vacancyId,
  candidateId,
}: TieBreakParts): string {
  return `${String(score).padStart(3, "0")}|${failedCount}|${vacancyId}|${candidateId}`;
}

/**
 * Order two decisions deterministically: higher score first, then fewer failed
 * constraints, then vacancy id, then candidate id. Ties are always broken the
 * same way for the same inputs.
 */
export function compareDecisions(a: MatchDecision, b: MatchDecision): number {
  if (a.score !== b.score) return b.score - a.score;
  if (a.failedConstraints.length !== b.failedConstraints.length) {
    return a.failedConstraints.length - b.failedConstraints.length;
  }
  const byVacancy = compareCodeUnits(a.vacancyId, b.vacancyId);
  if (byVacancy !== 0) return byVacancy;
  return compareCodeUnits(a.candidateId, b.candidateId);
}
