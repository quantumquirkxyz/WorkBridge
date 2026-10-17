import { compareCodeUnits, type RoutingPort } from "@workbridge/solver";
import { opportunityFreshness } from "./freshness";
import {
  availabilityScore,
  costScore,
  credentialScore,
  durationScore,
  gapCoverageScore,
  geographyScore,
  modalityScore,
  scheduleCoverage,
  scheduleScore,
  specializationOverlap,
  specializationScore,
  type DimensionScore,
} from "./scoring";
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
  routing?: RoutingPort;
}

/**
 * Static feasibility reasons, independent of the running budget. The candidate's
 * target specializations act as a filter: an opportunity that shares none is
 * excluded. Prerequisite satisfaction is evaluated during selection because an
 * earlier pick can unlock a later opportunity, so it is not a static exclusion.
 */
export function staticExclusionReasons(
  opportunity: TrainingOpportunity,
  preferences: TrainingPreferences,
  now: Date,
): string[] {
  const reasons: string[] = [];
  if (
    preferences.specializations.length > 0 &&
    specializationOverlap(opportunity, preferences).length === 0
  ) {
    reasons.push(
      `No pertenece a tu especialización objetivo (${preferences.specializations.join(", ")}).`,
    );
  }
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
  if (opportunity.schedule && preferences.availabilityWindow) {
    const { coverage, missingDays } = scheduleCoverage(
      opportunity.schedule,
      preferences.availabilityWindow,
    );
    if (coverage < 1) {
      const days = missingDays.length > 0 ? ` (días no disponibles: ${missingDays.join(", ")})` : "";
      reasons.push(`El horario no coincide con tu disponibilidad${days}.`);
    }
  }
  return reasons;
}

interface OpportunityScores {
  scores: Record<RankingDimension, DimensionScore>;
  coveredGaps: GapContribution[];
}

async function scoreOpportunity(
  opportunity: TrainingOpportunity,
  gaps: readonly TrainingGap[],
  preferences: TrainingPreferences,
  routing?: RoutingPort,
): Promise<OpportunityScores> {
  const gapCoverage = gapCoverageScore(opportunity, gaps);
  return {
    scores: {
      gap_coverage: gapCoverage,
      specialization: specializationScore(opportunity, preferences),
      cost: costScore(opportunity, preferences),
      duration: durationScore(opportunity, preferences),
      modality: modalityScore(opportunity, preferences),
      geography: await geographyScore(opportunity, preferences, routing),
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
  routing,
}: RankInput): Promise<RankedOpportunity[]> {
  const ranked = Promise.all(catalog.opportunities.map(async (opportunity): Promise<RankedOpportunity> => {
    const { scores, coveredGaps } = await scoreOpportunity(opportunity, gaps, preferences, routing);
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
    const commuteMinutes = scores.geography.commuteMinutes;
    if (
      commuteMinutes !== undefined &&
      preferences.maxCommuteMinutes !== undefined &&
      commuteMinutes > preferences.maxCommuteMinutes
    ) {
      exclusionReasons.push(
        `El traslado estimado de ${commuteMinutes} min supera tu límite de ${preferences.maxCommuteMinutes} min.`,
      );
    }
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
  }));

  return ranked.then((items) => {
    items.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return compareCodeUnits(a.opportunity.opportunityId, b.opportunity.opportunityId);
    });
    items.forEach((item, index) => {
    item.rank = index + 1;
    });
    return items;
  });
}
