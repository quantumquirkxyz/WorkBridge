import type { MatchDecision } from "./types";

export interface TieBreakParts {
  score: number;
  failedCount: number;
  vacancyId: string;
  candidateId: string;
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
  const byVacancy = a.vacancyId.localeCompare(b.vacancyId);
  if (byVacancy !== 0) return byVacancy;
  return a.candidateId.localeCompare(b.candidateId);
}
