import { compareCodeUnits, pairKey } from "../ties";
import type { AssignmentPair } from "./model";

export interface GreedyResult {
  selected: AssignmentPair[];
  objectiveValue: number;
}

/**
 * Deterministic greedy fallback: take the highest-scoring eligible pairs first,
 * skipping candidates that are already assigned and vacancies at capacity.
 * Ties break by vacancy id then candidate id, so the result never depends on
 * input order, process locale, or randomness.
 */
export function greedyAssignment(
  pairs: readonly AssignmentPair[],
  capacities: ReadonlyMap<string, number>,
): GreedyResult {
  const sorted = [...pairs].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return compareCodeUnits(
      pairKey(a.vacancyId, a.candidateId),
      pairKey(b.vacancyId, b.candidateId),
    );
  });

  const remaining = new Map(capacities);
  const assignedCandidates = new Set<string>();
  const selected: AssignmentPair[] = [];
  let objectiveValue = 0;

  for (const pair of sorted) {
    if (assignedCandidates.has(pair.candidateId)) continue;
    const left = remaining.get(pair.vacancyId) ?? 0;
    if (left <= 0) continue;
    remaining.set(pair.vacancyId, left - 1);
    assignedCandidates.add(pair.candidateId);
    selected.push(pair);
    objectiveValue += pair.score;
  }

  return { selected, objectiveValue };
}
