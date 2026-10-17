import { coveredSkillLevel } from "./scoring";
import { gapDeficit, heldSkillLevel } from "./gaps";
import { compareCodeUnits } from "./order";
import type {
  GapContribution,
  HeldSkill,
  RankedOpportunity,
  TrainingGap,
  TrainingPreferences,
} from "./types";

export interface SelectedOpportunity {
  ranked: RankedOpportunity;
  contributions: GapContribution[];
}

export interface OmittedOpportunity {
  ranked: RankedOpportunity;
  reason: string;
}

export interface SelectionResult {
  selected: SelectedOpportunity[];
  unresolvedGaps: TrainingGap[];
  omitted: OmittedOpportunity[];
}

interface Candidate {
  ranked: RankedOpportunity;
  contributions: GapContribution[];
  total: number;
}

function totalAdded(contributions: readonly GapContribution[]): number {
  return contributions.reduce((sum, contribution) => sum + contribution.addedLevel, 0);
}

/**
 * Greedy, deterministic set cover: repeatedly take the opportunity that
 * addresses the most outstanding gap levels, subject to the cost, duration,
 * availability (schedule), seat, freshness, and prerequisite constraints.
 *
 * Ties break by the ranking score and then by opportunity id. Because the
 * marginal contribution is recomputed after each pick, an opportunity that
 * unlocks a prerequisite chain is selectable in a later round.
 */
export function selectRoadmap(
  ranked: readonly RankedOpportunity[],
  gaps: readonly TrainingGap[],
  preferences: TrainingPreferences,
  heldSkills: readonly HeldSkill[],
): SelectionResult {
  const remainingDeficit = new Map<string, number>(
    gaps.map((gap) => [gap.skillId, gapDeficit(gap)]),
  );
  const currentLevel = new Map<string, number>(
    gaps.map((gap) => [gap.skillId, gap.currentLevel]),
  );
  let remainingBudget = preferences.maxCostUsd ?? Number.POSITIVE_INFINITY;
  let remainingHours = preferences.maxTotalHours ?? Number.POSITIVE_INFINITY;

  const prerequisitesMet = (rankedOpportunity: RankedOpportunity): boolean =>
    rankedOpportunity.opportunity.prerequisites.every(
      (skillId) =>
        heldSkillLevel(heldSkills, skillId) >= 1 || (currentLevel.get(skillId) ?? 0) >= 1,
    );

  const marginalContributions = (
    rankedOpportunity: RankedOpportunity,
  ): GapContribution[] => {
    const contributions: GapContribution[] = [];
    for (const gap of gaps) {
      const remaining = remainingDeficit.get(gap.skillId) ?? 0;
      if (remaining <= 0) continue;
      const level = coveredSkillLevel(rankedOpportunity.opportunity, gap.skillId);
      const added = Math.max(0, Math.min(level - (currentLevel.get(gap.skillId) ?? 0), remaining));
      if (added > 0) contributions.push({ skillId: gap.skillId, addedLevel: added });
    }
    return contributions;
  };

  const selected: SelectedOpportunity[] = [];
  const chosen = new Set<string>();

  for (;;) {
    let best: Candidate | null = null;
    for (const item of ranked) {
      if (chosen.has(item.opportunity.opportunityId)) continue;
      if (!item.eligible) continue;
      if (item.opportunity.costUsd > remainingBudget) continue;
      if (item.opportunity.durationHours > remainingHours) continue;
      if (!prerequisitesMet(item)) continue;

      const contributions = marginalContributions(item);
      const total = totalAdded(contributions);
      if (total <= 0) continue;

      if (
        best === null ||
        total > best.total ||
        (total === best.total && item.score > best.ranked.score) ||
        (total === best.total &&
          item.score === best.ranked.score &&
          compareCodeUnits(item.opportunity.opportunityId, best.ranked.opportunity.opportunityId) < 0)
      ) {
        best = { ranked: item, contributions, total };
      }
    }

    if (best === null) break;

    const id = best.ranked.opportunity.opportunityId;
    chosen.add(id);
    remainingBudget -= best.ranked.opportunity.costUsd;
    remainingHours -= best.ranked.opportunity.durationHours;
    for (const contribution of best.contributions) {
      const level = currentLevel.get(contribution.skillId) ?? 0;
      currentLevel.set(contribution.skillId, level + contribution.addedLevel);
      remainingDeficit.set(
        contribution.skillId,
        (remainingDeficit.get(contribution.skillId) ?? 0) - contribution.addedLevel,
      );
    }
    selected.push({ ranked: best.ranked, contributions: best.contributions });
  }

  const unresolvedGaps = gaps.filter((gap) => (remainingDeficit.get(gap.skillId) ?? 0) > 0);

  const unmetPrerequisites = (item: RankedOpportunity): string[] =>
    item.opportunity.prerequisites.filter(
      (skillId) =>
        heldSkillLevel(heldSkills, skillId) < 1 && (currentLevel.get(skillId) ?? 0) < 1,
    );

  const omitted: OmittedOpportunity[] = ranked
    .filter((item) => !chosen.has(item.opportunity.opportunityId))
    .map((item) => ({
      ranked: item,
      reason: omissionReason(item, unmetPrerequisites(item)),
    }));

  return { selected, unresolvedGaps, omitted };
}

function omissionReason(item: RankedOpportunity, unmetPrerequisites: readonly string[]): string {
  if (!item.eligible) {
    return item.exclusionReasons[0] ?? "La oportunidad no es viable.";
  }
  if (unmetPrerequisites.length > 0) {
    return `No cumples los prerrequisitos: ${unmetPrerequisites.join(", ")}.`;
  }
  return "No aportaba cobertura adicional a las brechas pendientes.";
}
