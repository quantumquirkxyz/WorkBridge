import type { AssignmentPair } from "./model";

export interface GreedyResult {
  selected: AssignmentPair[];
  objectiveValue: number;
}

function pairKey(pair: AssignmentPair): string {
  return `${pair.vacancyId}|${pair.candidateId}`;
}

/**
 * Deterministic greedy fallback: take the highest-scoring eligible pairs first,
 * skipping candidates that are already assigned and vacancies at capacity.
 * Ties break by vacancy id then candidate id, so the result never depends on
 * input order or randomness.
 */
export function greedyAssignment(
  pairs: readonly AssignmentPair[],
  capacities: ReadonlyMap<string, number>,
): GreedyResult {
  const sorted = [...pairs].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return pairKey(a).localeCompare(pairKey(b));
  });

  const remaining = new Map(capacities);
  const assignedCandidates = new Set<string>();
  const selected: AssignmentPair[] = [];
  let objectiveValue = 0;

  for (const pair of sorted) {
    if (assignedCandidates.has(pair.candidateId)) continue;
    const capacity = remaining.get(pair.vacancyId) ?? 0;
    if (capacity <= 0) continue;
    remaining.set(pair.vacancyId, capacity - 1);
    assignedCandidates.add(pair.candidateId);
    selected.push(pair);
    objectiveValue += pair.score;
  }

  return { selected, objectiveValue };
}
