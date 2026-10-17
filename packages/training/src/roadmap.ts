import { assertRoadmap } from "./validate";
import { freshnessLabelEs } from "./freshness";
import { gapLabel } from "./gaps";
import { modalityLabelEs, typeLabelEs } from "./scoring";
import { rankOpportunities } from "./rank";
import { selectRoadmap, type SelectedOpportunity } from "./select";
import { TrainingInputError } from "./errors";
import type {
  BuildRoadmapOptions,
  ExcludedOpportunity,
  Roadmap,
  RoadmapRecommendation,
  TrainingCatalog,
  TrainingGap,
  RoadmapRequest,
} from "./types";

function formatUsd(costUsd: number): string {
  return costUsd === 0 ? "gratis" : `USD ${costUsd}`;
}

/** Spanish explanation with the covered gaps, the source, and the freshness. */
export function explanationEs(
  selected: SelectedOpportunity,
  gaps: readonly TrainingGap[],
): string {
  const { opportunity } = selected.ranked;
  const parts = [
    `${typeLabelEs(opportunity.type)} "${opportunity.title}" de ${opportunity.provider} ` +
      `(${modalityLabelEs(opportunity.modality)}, ${opportunity.durationHours} h, ${formatUsd(opportunity.costUsd)}).`,
  ];
  if (selected.contributions.length > 0) {
    const labels = selected.contributions.map((contribution) => {
      const gap = gaps.find((item) => item.skillId === contribution.skillId);
      return gap ? gapLabel(gap) : contribution.skillId;
    });
    parts.push(`Cubre: ${labels.join(", ")}.`);
  }
  parts.push(`Fuente: ${opportunity.source}; ${freshnessLabelEs(selected.ranked.freshness)}.`);
  return parts.join(" ");
}

function summaryReasons(
  request: RoadmapRequest,
  recommendationCount: number,
  unresolvedSkillIds: readonly string[],
): string[] {
  if (request.gaps.length === 0) {
    return ["No hay brechas que cerrar; no se requiere un roadmap de formación."];
  }
  const reasons = [
    `Se recomiendan ${recommendationCount} oportunidad(es) del catálogo para cerrar ` +
      `${request.gaps.length - unresolvedSkillIds.length} de ${request.gaps.length} brecha(s).`,
  ];
  if (unresolvedSkillIds.length > 0) {
    reasons.push(
      `Sin opción en el catálogo para: ${unresolvedSkillIds.join(", ")}. Se requiere ampliar el catálogo.`,
    );
  }
  if (request.aptitude === "apt") {
    reasons.push("El candidato ya es apto; el roadmap es opcional.");
  }
  return reasons;
}

/**
 * Build a deterministic, validated `Roadmap` from a cached catalog snapshot and
 * the candidate's gaps. Only catalogued opportunities are ever recommended;
 * each recommendation embeds the exact catalog entry it came from.
 */
export function buildRoadmap(
  request: RoadmapRequest,
  catalog: TrainingCatalog,
  options: BuildRoadmapOptions = {},
): Roadmap {
  if (typeof request.candidateId !== "string" || request.candidateId.length === 0) {
    throw new TrainingInputError("RoadmapRequest.candidateId must be a non-empty string.");
  }
  if (!request.preferences) {
    throw new TrainingInputError("RoadmapRequest.preferences is required.");
  }
  const gaps = request.gaps ?? [];
  const heldSkills = request.heldSkills ?? [];
  const now = (options.now ?? (() => new Date()))();

  const ranked = rankOpportunities({ catalog, gaps, preferences: request.preferences, now });
  const selection = selectRoadmap(ranked, gaps, request.preferences, heldSkills);

  const recommendations: RoadmapRecommendation[] = selection.selected.map(
    (selected, index) => ({
      rank: index + 1,
      score: selected.ranked.score,
      scoreBreakdown: selected.ranked.breakdown,
      coveredGaps: selected.contributions,
      explanationEs: explanationEs(selected, gaps),
      source: selected.ranked.opportunity.source,
      retrievedAt: selected.ranked.opportunity.retrievedAt,
      freshness: selected.ranked.freshness,
      opportunity: selected.ranked.opportunity,
    }),
  );

  const excludedOpportunities: ExcludedOpportunity[] = selection.omitted.map((item) => ({
    opportunityId: item.ranked.opportunity.opportunityId,
    reason: item.reason,
  }));

  const totals = {
    costUsd: recommendations.reduce((sum, item) => sum + item.opportunity.costUsd, 0),
    durationHours: recommendations.reduce((sum, item) => sum + item.opportunity.durationHours, 0),
    recommendationCount: recommendations.length,
    coveredGapCount: gaps.length - selection.unresolvedGaps.length,
    unresolvedGapCount: selection.unresolvedGaps.length,
  };

  const roadmap: Roadmap = {
    schemaVersion: "1.0.0",
    candidateId: request.candidateId,
    targetVacancyId: request.targetVacancyId ?? null,
    aptitude: request.aptitude,
    generatedAt: now.toISOString(),
    catalogVersion: catalog.catalogVersion,
    constraints: {
      specializations: request.preferences.specializations,
      maxCostUsd: request.preferences.maxCostUsd ?? null,
      maxTotalHours: request.preferences.maxTotalHours ?? null,
    },
    gaps,
    recommendations,
    unresolvedGaps: selection.unresolvedGaps,
    excludedOpportunities,
    totals,
    reasons: summaryReasons(
      request,
      recommendations.length,
      selection.unresolvedGaps.map((gap) => gap.skillId),
    ),
  };

  assertRoadmap(roadmap);
  return roadmap;
}
