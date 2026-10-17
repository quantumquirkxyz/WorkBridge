import {
  compareCodeUnits,
  highsMilpSolver,
  type MilpConstraint,
  type MilpSolverPort,
} from "@workbridge/solver";
import { coveredSkillLevel } from "./scoring";
import { gapDeficit, heldSkillLevel } from "./gaps";
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

function contributionFor(
  ranked: readonly RankedOpportunity[],
  gaps: readonly TrainingGap[],
): Map<string, GapContribution[]> {
  const result = new Map<string, GapContribution[]>();
  for (const item of ranked) {
    const contributions = gaps.flatMap((gap) => {
      const added = Math.max(
        0,
        Math.min(coveredSkillLevel(item.opportunity, gap.skillId) - gap.currentLevel, gapDeficit(gap)),
      );
      return added > 0 ? [{ skillId: gap.skillId, addedLevel: added }] : [];
    });
    result.set(item.opportunity.opportunityId, contributions);
  }
  return result;
}

function contributionsAtLevels(
  item: RankedOpportunity,
  gaps: readonly TrainingGap[],
  levels: ReadonlyMap<string, number>,
): GapContribution[] {
  return gaps.flatMap((gap) => {
    const current = levels.get(gap.skillId) ?? gap.currentLevel;
    const added = Math.max(
      0,
      Math.min(coveredSkillLevel(item.opportunity, gap.skillId) - current, gap.requiredLevel - current),
    );
    return added > 0 ? [{ skillId: gap.skillId, addedLevel: added }] : [];
  });
}

function cyclicVariableIndices(
  variables: readonly { item: RankedOpportunity }[],
  heldSkills: readonly HeldSkill[],
): Set<number> {
  const state = new Map<number, 0 | 1 | 2>();
  const cycles = new Set<number>();
  const visit = (index: number, path: readonly number[]): void => {
    if (state.get(index) === 1) {
      const start = path.indexOf(index);
      for (const cycleIndex of path.slice(start)) cycles.add(cycleIndex);
      return;
    }
    if (state.get(index) === 2) return;
    state.set(index, 1);
    for (const prerequisite of variables[index]!.item.opportunity.prerequisites) {
      if (heldSkillLevel(heldSkills, prerequisite) >= 1) continue;
      for (const [providerIndex, provider] of variables.entries()) {
        if (providerIndex !== index && coveredSkillLevel(provider.item.opportunity, prerequisite) >= 1) {
          visit(providerIndex, [...path, index]);
        }
      }
    }
    state.set(index, 2);
  };
  variables.forEach((_, index) => visit(index, []));
  return cycles;
}

function omissionReason(item: RankedOpportunity, unmet: readonly string[]): string {
  if (!item.eligible) return item.exclusionReasons[0] ?? "La oportunidad no es viable.";
  if (unmet.length > 0) return `No cumples los prerrequisitos: ${unmet.join(", ")}.`;
  return "No aportaba cobertura adicional a las brechas pendientes.";
}

function buildRoadmapModel(
  ranked: readonly RankedOpportunity[],
  gaps: readonly TrainingGap[],
  preferences: TrainingPreferences,
  heldSkills: readonly HeldSkill[],
) {
  const eligible = ranked.filter((item) => item.eligible);
  const contributions = contributionFor(eligible, gaps);
  const variables = eligible.map((item, index) => ({
    name: `y${index}`,
    item,
  }));
  const coverageVariables = gaps.flatMap((gap, gapIndex) =>
    Array.from({ length: gapDeficit(gap) }, (_, index) => ({
      name: `z${gapIndex}_${index + 1}`,
      skillId: gap.skillId,
      level: gap.currentLevel + index + 1,
    })),
  );
  const cyclic = cyclicVariableIndices(variables, heldSkills);
  const milpVariables = [
    // A tiny penalty makes the optimum canonical: do not select courses that
    // add no coverage unless they are needed as a prerequisite.
    ...variables.map(({ name, item }, index) => ({
      name,
      cost: -(item.score / 1_000_000 + (1 - item.rank / Math.max(1, ranked.length)) / 1_000_000_000),
      lower: 0,
      upper: cyclic.has(index) ? 0 : 1,
      integer: true,
    })),
    ...coverageVariables.map(({ name }) => ({ name, cost: 1, lower: 0, upper: 1, integer: true })),
  ];
  const constraints: MilpConstraint[] = [];
  const y = (index: number) => variables[index]!.name;

  for (const coverage of coverageVariables) {
    const covering = variables
      .filter(({ item }) => coveredSkillLevel(item.opportunity, coverage.skillId) >= coverage.level)
      .map(({ name }) => name);
    constraints.push({
        name: `cover_${coverage.name}`,
      coefficients: { [coverage.name]: 1, ...Object.fromEntries(covering.map((name) => [name, -1])) },
      upper: 0,
    });
  }

  for (const [index, { item }] of variables.entries()) {
    for (const prerequisite of item.opportunity.prerequisites) {
      if (heldSkillLevel(heldSkills, prerequisite) >= 1) continue;
      if (coveredSkillLevel(item.opportunity, prerequisite) >= 1) {
        constraints.push({ name: `self_prereq_${index}`, coefficients: { [y(index)]: 1 }, upper: 0 });
        continue;
      }
      constraints.push({
        name: `prereq_${index}_${item.opportunity.prerequisites.indexOf(prerequisite)}`,
        coefficients: {
          [y(index)]: 1,
          ...Object.fromEntries(
            variables
              .filter(({ item: prerequisiteItem }, prerequisiteIndex) =>
                prerequisiteIndex !== index && coveredSkillLevel(prerequisiteItem.opportunity, prerequisite) >= 1,
              )
              .map(({ name }) => [name, -1]),
          ),
        },
        upper: 0,
      });
    }
  }
  if (preferences.maxCostUsd !== undefined) {
    constraints.push({
      name: "budget",
      coefficients: Object.fromEntries(variables.map(({ name, item }) => [name, item.opportunity.costUsd])),
      upper: preferences.maxCostUsd,
    });
  }
  if (preferences.maxTotalHours !== undefined) {
    constraints.push({
      name: "duration",
      coefficients: Object.fromEntries(variables.map(({ name, item }) => [name, item.opportunity.durationHours])),
      upper: preferences.maxTotalHours,
    });
  }
  return {
    model: { sense: "maximize" as const, variables: milpVariables, constraints },
    variables,
    contributions,
  };
}

/** Selects a maximum gap-covering roadmap with the shared deterministic MILP seam. */
export async function selectRoadmap(
  ranked: readonly RankedOpportunity[],
  gaps: readonly TrainingGap[],
  preferences: TrainingPreferences,
  heldSkills: readonly HeldSkill[],
  solver: MilpSolverPort = highsMilpSolver,
): Promise<SelectionResult> {
  if (gaps.length === 0) return finishSelection(ranked, gaps, heldSkills, []);
  const built = buildRoadmapModel(ranked, gaps, preferences, heldSkills);
  let solution;
  try {
    solution = await solver.solve(built.model);
  } catch {
    return greedyFallback(ranked, gaps, preferences, heldSkills);
  }
  if (solution.status !== "optimal") {
    return greedyFallback(ranked, gaps, preferences, heldSkills);
  }
  const selectedIds = built.variables
    .filter(({ name }) => (solution.values[name] ?? 0) > 0.5)
    .map(({ item }) => item.opportunity.opportunityId);
  const selected = built.variables
    .filter(({ item }) => selectedIds.includes(item.opportunity.opportunityId))
    .sort((a, b) => a.item.rank - b.item.rank || compareCodeUnits(a.item.opportunity.opportunityId, b.item.opportunity.opportunityId))
    .map(({ item }) => ({ ranked: item, contributions: built.contributions.get(item.opportunity.opportunityId) ?? [] }));
  return finishSelection(ranked, gaps, heldSkills, selected);
}

function finishSelection(
  ranked: readonly RankedOpportunity[],
  gaps: readonly TrainingGap[],
  heldSkills: readonly HeldSkill[],
  selected: SelectedOpportunity[],
): SelectionResult {
  const levels = new Map(gaps.map((gap) => [gap.skillId, gap.currentLevel]));
  for (const item of selected) {
    item.contributions = contributionsAtLevels(item.ranked, gaps, levels);
    for (const contribution of item.contributions) {
      levels.set(
        contribution.skillId,
        Math.min(4, (levels.get(contribution.skillId) ?? 0) + contribution.addedLevel) as TrainingGap["currentLevel"],
      );
    }
  }
  const unresolvedGaps = gaps.filter((gap) => (levels.get(gap.skillId) ?? 0) < gap.requiredLevel);
  const chosen = new Set(selected.map(({ ranked: item }) => item.opportunity.opportunityId));
  const satisfied = (skillId: string) => heldSkillLevel(heldSkills, skillId) >= 1 || levels.has(skillId) && (levels.get(skillId) ?? 0) >= 1;
  const omitted = ranked.filter((item) => !chosen.has(item.opportunity.opportunityId)).map((item) => ({
    ranked: item,
    reason: omissionReason(item, item.opportunity.prerequisites.filter((skill) => !satisfied(skill))),
  }));
  return { selected, unresolvedGaps, omitted };
}

// Safety fallback preserves deterministic behavior when HiGHS is unavailable.
function greedyFallback(
  ranked: readonly RankedOpportunity[],
  gaps: readonly TrainingGap[],
  preferences: TrainingPreferences,
  heldSkills: readonly HeldSkill[],
): SelectionResult {
  const selected: SelectedOpportunity[] = [];
  let budget = preferences.maxCostUsd ?? Number.POSITIVE_INFINITY;
  let hours = preferences.maxTotalHours ?? Number.POSITIVE_INFINITY;
  const chosen = new Set<string>();
  const levels = new Map(gaps.map((gap) => [gap.skillId, gap.currentLevel]));
  const prerequisiteClosure = (
    item: RankedOpportunity,
    visiting: ReadonlySet<string> = new Set(),
  ): RankedOpportunity[] | null => {
    if (visiting.has(item.opportunity.opportunityId)) return null;
    const nextVisiting = new Set(visiting).add(item.opportunity.opportunityId);
    const providers: RankedOpportunity[] = [];
    for (const skill of item.opportunity.prerequisites) {
      if (heldSkillLevel(heldSkills, skill) >= 1 || (levels.get(skill) ?? 0) >= 1) continue;
      const provider = ranked.find((candidate) =>
        candidate.eligible &&
        candidate.opportunity.opportunityId !== item.opportunity.opportunityId &&
        coveredSkillLevel(candidate.opportunity, skill) >= 1,
      );
      if (!provider) return null;
      const nested = prerequisiteClosure(provider, nextVisiting);
      if (nested === null) return null;
      providers.push(...nested, provider);
    }
    return providers;
  };
  while (true) {
    const candidate = ranked
      .filter((item) => item.eligible && !chosen.has(item.opportunity.opportunityId))
      .map((item) => {
        const closure = prerequisiteClosure(item);
        if (closure === null) return null;
        const required = [...closure, item].filter((entry, index, all) => all.findIndex((candidate) => candidate.opportunity.opportunityId === entry.opportunity.opportunityId) === index);
        return { item, required, contributions: contributionsAtLevels(item, gaps, levels) };
      })
      .filter((candidate): candidate is NonNullable<typeof candidate> => candidate !== null)
      .filter(({ required, contributions }) =>
        contributions.length > 0 &&
        required.every((entry) => !chosen.has(entry.opportunity.opportunityId)) &&
        required.reduce((sum, entry) => sum + entry.opportunity.costUsd, 0) <= budget &&
        required.reduce((sum, entry) => sum + entry.opportunity.durationHours, 0) <= hours,
      )
      .filter(({ contributions }) => contributions.length > 0)
      .sort((a, b) => (b.contributions.reduce((n, c) => n + c.addedLevel, 0) - a.contributions.reduce((n, c) => n + c.addedLevel, 0)) || b.item.score - a.item.score || compareCodeUnits(a.item.opportunity.opportunityId, b.item.opportunity.opportunityId))[0];
    if (!candidate) break;
    chosen.add(candidate.item.opportunity.opportunityId);
    const required = candidate.required;
    for (const item of required) {
      budget -= item.opportunity.costUsd;
      hours -= item.opportunity.durationHours;
      const itemContributions = contributionsAtLevels(item, gaps, levels);
      selected.push({ ranked: item, contributions: itemContributions });
      for (const contribution of itemContributions) levels.set(contribution.skillId, Math.min(4, (levels.get(contribution.skillId) ?? 0) + contribution.addedLevel) as TrainingGap["currentLevel"]);
      for (const skill of item.opportunity.coveredSkills) {
        levels.set(skill.skillId, Math.max(levels.get(skill.skillId) ?? 0, skill.level) as TrainingGap["currentLevel"]);
      }
      chosen.add(item.opportunity.opportunityId);
    }
  }
  return finishSelection(ranked, gaps, heldSkills, selected);
}
