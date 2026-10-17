import { clampScore } from "@puente/solver";
import type { RankingDimension } from "./types";

/**
 * Confirmed ranking criteria for the training roadmap (spec #2): gap coverage,
 * specialization fit, cost, duration, modality, geography, schedule,
 * availability, and credential relevance. They must sum to 1.
 */
export const TRAINING_WEIGHTS: Readonly<Record<RankingDimension, number>> = {
  gap_coverage: 0.3,
  specialization: 0.15,
  cost: 0.12,
  duration: 0.08,
  modality: 0.08,
  geography: 0.07,
  schedule: 0.08,
  availability: 0.05,
  credential_relevance: 0.07,
};

/** Stable dimension order used by every breakdown. */
export const RANKING_DIMENSIONS = Object.keys(TRAINING_WEIGHTS) as RankingDimension[];

/** Weighted sum of the nine dimension scores, clamped to 0–100 and rounded. */
export function weightedTrainingScore(
  dimensionScores: Readonly<Record<RankingDimension, number>>,
): number {
  let total = 0;
  for (const dimension of RANKING_DIMENSIONS) {
    total += TRAINING_WEIGHTS[dimension] * clampScore(dimensionScores[dimension]);
  }
  return clampScore(total);
}
