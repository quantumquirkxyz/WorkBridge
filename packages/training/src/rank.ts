import { opportunityFreshness } from "./freshness";
import {
  availabilityScore,
  costScore,
  credentialScore,
  durationScore,
  gapCoverageScore,
  geographyScore,
  modalityScore,
  scheduleScore,
  specializationScore,
  type DimensionScore,
} from "./scoring";
import { compareCodeUnits } from "./order";
import { RANKING_DIMENSIONS, TRAINING_WEIGHTS, weightedTrainingScore } from "./weights";
import type {
  GapContribution,
  RankedOpportunity,
  RankingBreakdownItem,
  RankingDimension,
  TrainingCatalog,
  TrainingGap,
  TrainingOpportunity,
  TrainingPreferences,
} from "./types";

export interface RankInput {
  catalog: TrainingCatalog;
  gaps: readonly TrainingGap[];
  preferences: TrainingPreferences;
  now: Date;
}

/**
 * Static feasibility reasons, independent of the running budget. Prerequisite
 * satisfaction is evaluated during selection because an earlier pick can unlock
 * a later opportunity, so it is not a static exclusion.
 */
export function staticExclusionReasons(
  opportunity: TrainingOpportunity,
  preferences: TrainingPreferences,
  now: Date,
): string[] {
  const reasons: string[] = [];
  if (opportunityFreshness(opportunity.retrievedAt, now) === "expired") {
    reasons.push("Datos del catálogo vencidos (más de 72 h): requiere actualización.");
  }
  if (opportunity.seatsAvailable < 1) {
    reasons.push("Sin cupos disponibles.");
  }
  if (preferences.maxCostUsd !== undefined && opportunity.costUsd > preferences.maxCostUsd) {
    reasons.push(
      `Cuesta USD ${opportunity.costUsd}, por encima de tu límite de USD ${preferences.maxCostUsd}.`,
    );
  }
  return reasons;
}

interface OpportunityScores {
  scores: Record<RankingDimension, DimensionScore>;
  coveredGaps: GapContribution[];
}

function scoreOpportunity(
  opportunity: TrainingOpportunity,
  gaps: readonly TrainingGap[],
  preferences: TrainingPreferences,
): OpportunityScores {
  const gapCoverage = gapCoverageScore(opportunity, gaps);
  return {
    scores: {
      gap_coverage: gapCoverage,
      specialization: specializationScore(opportunity, preferences),
      cost: costScore(opportunity, preferences),
      duration: durationScore(opportunity, preferences),
      modality: modalityScore(opportunity, preferences),
      geography: geographyScore(opportunity, preferences),
      schedule: scheduleScore(opportunity, preferences),
      availability: availabilityScore(opportunity),
      credential_relevance: credentialScore(opportunity),
    },
    coveredGaps: gapCoverage.coveredGaps,
  };
}

/**
 * Rank every catalogued opportunity deterministically by the nine confirmed
 * criteria. Ties break by opportunity id, so the order never depends on input
 * order, locale, or randomness. Ineligible opportunities are still ranked and
 * carry their exclusion reasons.
 */
export function rankOpportunities({
  catalog,
  gaps,
  preferences,
  now,
}: RankInput): RankedOpportunity[] {
  const ranked = catalog.opportunities.map((opportunity): RankedOpportunity => {
    const { scores, coveredGaps } = scoreOpportunity(opportunity, gaps, preferences);
    const rawScores = Object.fromEntries(
      RANKING_DIMENSIONS.map((dimension) => [dimension, scores[dimension].rawScore]),
    ) as Record<RankingDimension, number>;
    const score = weightedTrainingScore(rawScores);
    const breakdown: RankingBreakdownItem[] = RANKING_DIMENSIONS.map((dimension) => ({
      dimension,
      weight: TRAINING_WEIGHTS[dimension],
      rawScore: scores[dimension].rawScore,
      weightedScore: Number((TRAINING_WEIGHTS[dimension] * scores[dimension].rawScore).toFixed(2)),
      reasons: scores[dimension].reasons,
    }));
    const exclusionReasons = staticExclusionReasons(opportunity, preferences, now);
    return {
      opportunity,
      score,
      breakdown,
      coveredGaps,
      freshness: opportunityFreshness(opportunity.retrievedAt, now),
      eligible: exclusionReasons.length === 0,
      exclusionReasons,
      rank: 0,
    };
  });

  ranked.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return compareCodeUnits(a.opportunity.opportunityId, b.opportunity.opportunityId);
  });
  ranked.forEach((item, index) => {
    item.rank = index + 1;
  });
  return ranked;
}
