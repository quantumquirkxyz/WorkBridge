import { PANAMA_SKILL_TAXONOMY } from "@puente/domain";
import { bestSkillSignal, compareCodeUnits } from "@puente/solver";
import type { SkillLevel } from "@puente/solver";
import type { DeriveGapsInput, GapContribution, GapKind, HeldSkill, TrainingGap } from "./types";

const TAXONOMY_BY_ID = new Map(PANAMA_SKILL_TAXONOMY.skills.map((skill) => [skill.id, skill]));

/** Classify a canonical skill id into a gap kind. */
export function gapKindForSkill(skillId: string): GapKind {
  if (skillId.startsWith("PA-SOFT")) return "soft";
  if (skillId.startsWith("PA-LANG")) return "language";
  return "technical";
}

/** Spanish taxonomy label for a canonical skill id, or `null` when unknown. */
export function gapLabelForSkill(skillId: string): string | null {
  return TAXONOMY_BY_ID.get(skillId)?.labelEs ?? null;
}

/** Display label for a gap, falling back to its canonical skill id. */
export function gapLabel(gap: TrainingGap): string {
  return gap.label ?? gap.skillId;
}

/**
 * Display label for a gap contribution. Contributions always come from the
 * request's gaps, but resolving the skill id is kept total so a stray
 * contribution still yields a usable label.
 */
export function gapLabelForContribution(
  gaps: readonly TrainingGap[],
  contribution: GapContribution,
): string {
  const gap = gaps.find((item) => item.skillId === contribution.skillId);
  return gap ? gapLabel(gap) : contribution.skillId;
}

/** Effective required level, defaulting to 1 when the vacancy left it unset. */
export function effectiveRequiredLevel(requiredLevel: number): SkillLevel {
  const clamped = requiredLevel > 0 ? requiredLevel : 1;
  return Math.min(4, Math.max(0, Math.round(clamped))) as SkillLevel;
}

/** Unaddressed levels for a gap; at least 1 so a gap always carries weight. */
export function gapDeficit(gap: TrainingGap): number {
  return Math.max(1, gap.requiredLevel - gap.currentLevel);
}

/** Highest level the candidate already holds for a skill; 0 when unknown. */
export function heldSkillLevel(heldSkills: readonly HeldSkill[], skillId: string): number {
  let best = 0;
  for (const held of heldSkills) {
    if (held.skillId === skillId && held.level > best) best = held.level;
  }
  return best;
}

/**
 * Derive training gaps from the deterministic solver output (ticket #8).
 *
 * For every mapped mandatory and desirable requirement, a gap exists when the
 * candidate's best demonstrated level is below the required level. Mandatory
 * gaps win over desirable ones for the same skill, and the highest required
 * level is kept. Ordering is by skill id so the result is reproducible.
 */
export function deriveGaps({ candidate, vacancy }: DeriveGapsInput): TrainingGap[] {
  const bySkill = new Map<string, TrainingGap>();

  const consider = (requirements: DeriveGapsInput["vacancy"]["mandatory"], mandatory: boolean) => {
    for (const requirement of requirements) {
      const skillId = requirement.skillId;
      if (skillId === null) continue;
      const requiredLevel = effectiveRequiredLevel(requirement.requiredLevel);
      const currentLevel = bestSkillSignal(candidate.skills, skillId)?.level ?? 0;
      if (currentLevel >= requiredLevel) continue;

      const existing = bySkill.get(skillId);
      if (existing) {
        existing.mandatory = existing.mandatory || mandatory;
        existing.requiredLevel = Math.max(existing.requiredLevel, requiredLevel) as SkillLevel;
        continue;
      }
      bySkill.set(skillId, {
        skillId,
        label: gapLabelForSkill(skillId),
        kind: gapKindForSkill(skillId),
        requiredLevel,
        currentLevel,
        mandatory,
      });
    }
  };

  consider(vacancy.mandatory, true);
  consider(vacancy.desirable, false);

  return [...bySkill.values()].sort((a, b) => compareCodeUnits(a.skillId, b.skillId));
}
