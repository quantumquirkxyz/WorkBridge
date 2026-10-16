import type { Aptitude, ScoreDimension } from "./types";

/** Confirmed matching weights from spec #2. They must sum to 1. */
export const MATCH_WEIGHTS: Readonly<Record<ScoreDimension, number>> = {
  technical: 0.3,
  experience: 0.25,
  availability: 0.15,
  transport: 0.2,
  salary: 0.1,
};

export const WEIGHTS_VERSION = "2026.10.0";

/** Inclusive aptitude thresholds. */
export const APT_THRESHOLD = 75;
export const APT_WITH_GAPS_THRESHOLD = 50;

/**
 * The one-point promotion can lift exactly one boundary: 74 → 75 (gaps → apt)
 * or 49 → 50 (not apt → gaps).
 */
export const PROMOTION_POINTS = 1;

/** Scores that a one-point promotion would move across a threshold. */
export const PROMOTION_BAND: readonly number[] = [
  APT_THRESHOLD - PROMOTION_POINTS,
  APT_WITH_GAPS_THRESHOLD - PROMOTION_POINTS,
];

/**
 * Map a score to an aptitude state. Hard-constraint failures always resolve to
 * `not_currently_apt` and are handled by the caller before this function.
 */
export function classifyAptitude(score: number): Aptitude {
  if (score >= APT_THRESHOLD) return "apt";
  if (score >= APT_WITH_GAPS_THRESHOLD) return "apt_with_gaps";
  return "not_currently_apt";
}

/** Weighted sum of the dimension scores, clamped to 0–100 and rounded. */
export function weightedScore(
  dimensionScores: Readonly<Record<ScoreDimension, number>>,
): number {
  let total = 0;
  for (const dimension of Object.keys(MATCH_WEIGHTS) as ScoreDimension[]) {
    total += MATCH_WEIGHTS[dimension] * clampScore(dimensionScores[dimension]);
  }
  return clampScore(total);
}

export function clampScore(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}
