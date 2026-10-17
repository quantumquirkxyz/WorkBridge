import { matchSkill, resolveTargetRoles, type CandidatePreferences } from '@puente/domain';
import { validateExplorationResult, type ExplorationResult } from '@puente/catalog';
import {
  buildRoadmap,
  createSeedTrainingCatalog,
  type Modality,
  type Roadmap,
  type TrainingCatalog,
  type TrainingGap,
} from '@puente/training';

export interface RoadmapHandlerDeps {
  /** Injected for tests; defaults to the bundled cached training catalogue. */
  trainingCatalog?: TrainingCatalog;
  now?: () => Date;
}

export interface RoadmapHandlerResult {
  status: number;
  body: unknown;
}

/** Role definition id → training specialization slug used by the catalogue. */
const ROLE_TO_SPECIALIZATION: Record<string, string> = {
  'plp:role:soporte-tecnico': 'it_support',
  'plp:role:atencion-cliente': 'customer_service',
  'plp:role:asistente-administrativo': 'administration',
};

/** Level a blocked mandatory skill must reach. The catalogue encodes levels 0–4. */
const REQUIRED_LEVEL = 2;

function preferredModalities(modality: CandidatePreferences['modality']): Modality[] {
  if (modality === 'remote') return ['online'];
  if (modality === 'hybrid') return ['hybrid', 'online'];
  return ['onsite', 'hybrid'];
}

function specializationsFor(preferences: CandidatePreferences): string[] {
  const roles = resolveTargetRoles(preferences.target_roles);
  const slugs = roles
    .map((role) => ROLE_TO_SPECIALIZATION[role.role_id])
    .filter((slug): slug is string => typeof slug === 'string');
  return [...new Set(slugs)].sort();
}

/**
 * Derive training gaps from the vacancies that blocked the candidate: a
 * near-match vacancy is one the candidate would fit but for a single declared
 * constraint, so its required skills are exactly the ones worth training for.
 * Each label is mapped to its canonical taxonomy id; unmapped labels are dropped
 * rather than invented, because the training catalogue is keyed by taxonomy id.
 */
export function deriveGaps(result: ExplorationResult): TrainingGap[] {
  const blocked = result.noMatch?.nearMatches ?? [];
  const bySkillId = new Map<string, TrainingGap>();
  for (const near of blocked) {
    for (const skill of near.vacancy.skills) {
      if (!skill.required) continue;
      const matched = matchSkill(skill.labelEs);
      const skillId = matched.skillId;
      if (!skillId || bySkillId.has(skillId)) continue;
      bySkillId.set(skillId, {
        skillId,
        label: matched.labelEs ?? skill.labelEs ?? null,
        kind: 'technical',
        requiredLevel: REQUIRED_LEVEL,
        currentLevel: 0,
        mandatory: true,
      });
    }
  }
  return [...bySkillId.values()].sort((a, b) => (a.skillId < b.skillId ? -1 : a.skillId > b.skillId ? 1 : 0));
}

/**
 * Build a real training roadmap for a no-match exploration result.
 *
 * This is the "trigger the training-roadmap path" seam: the Exploration Agent
 * never calls training itself (ADR-0002/0004 keep the seams separate). The web
 * handler composes them, invoking the deterministic `buildRoadmap` from
 * `@puente/training` only when the exploration produced no viable match. When
 * matches do exist there is nothing to trigger, so `roadmap` is `null`.
 */
export function handleRoadmap(payload: unknown, deps: RoadmapHandlerDeps = {}): RoadmapHandlerResult {
  if (!validateExplorationResult(payload)) {
    return { status: 400, body: { error: 'invalid_exploration_result' } };
  }
  const result = payload as ExplorationResult;

  if (result.matches.length > 0) {
    return { status: 200, body: { roadmap: null, gaps: [] } };
  }

  const gaps = deriveGaps(result);
  const catalog = deps.trainingCatalog ?? createSeedTrainingCatalog();
  const roadmap: Roadmap = buildRoadmap(
    {
      candidateId: result.candidateId,
      aptitude: 'not_currently_apt',
      gaps,
      heldSkills: [],
      preferences: {
        specializations: specializationsFor(result.preferences),
        preferredModalities: preferredModalities(result.preferences.modality),
        availabilityWindow: {
          days: result.preferences.availability.days,
          startMinute: result.preferences.availability.start_minute,
          endMinute: result.preferences.availability.end_minute,
          weeklyHours: result.preferences.availability.weekly_hours,
        },
      },
    },
    catalog,
    { now: deps.now },
  );

  return { status: 200, body: { roadmap, gaps } };
}
