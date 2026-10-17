import { matchSkill, resolveTargetRoles, type CandidatePreferences, type CandidateProfile } from '@puente/domain';
import { validateExplorationResult, type ExplorationResult } from '@puente/catalog';
import {
  DEFAULT_GEO_POINT,
  toSolverCandidate,
  toSolverVacancy,
  type MatchingService,
} from '@puente/agent-runtime';
import {
  buildRoadmap,
  createSeedTrainingCatalog,
  deriveGaps,
  type Modality,
  type Roadmap,
  type BuildRoadmapOptions,
  type TrainingCatalog,
  type TrainingGap,
} from '@puente/training';
import type { HandlerResult } from './handler-result';
import { profileStore, type ProfileStore } from './profile-store';
import { readCandidateProfile } from './neon-repository';
import { candidateContext, matchingService, vacancyInput } from './matching-input';

export interface RoadmapHandlerDeps {
  /** Injected for tests; defaults to the bundled cached training catalogue. */
  trainingCatalog?: TrainingCatalog;
  now?: () => Date;
  routing?: BuildRoadmapOptions['routing'];
  profileStore?: ProfileStore;
  service?: MatchingService;
  loadProfile?: (candidateId: string) => Promise<CandidateProfile | undefined>;
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
 * Derive *advisory* training gaps from the vacancies that blocked the candidate:
 * a near-match vacancy is one the candidate would fit but for a single declared
 * constraint, so its required skills are the ones worth training for. Each label
 * is mapped to its canonical taxonomy id; unmapped labels are dropped rather than
 * invented, because the training catalogue is keyed by taxonomy id.
 *
 * This is deliberately named `deriveAdvisoryGaps` and not `deriveGaps`, because
 * `@puente/training` already owns the canonical `deriveGaps({ candidate,
 * vacancy })` that consumes deterministic solver output. See
 * `.agents/adr/0005-exploration-advisory-training-roadmap.md`: the exploration
 * slice has no candidate skill profile, so it must not claim the solver's
 * aptitude decision. It composes an advisory roadmap from exploration evidence
 * only, to be replaced by the solver seam once wired.
 */
export function deriveAdvisoryGaps(result: ExplorationResult): TrainingGap[] {
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
 * Build a training roadmap for a no-match exploration result.
 *
 * This is the "trigger the training-roadmap path" seam. The Exploration Agent
 * never calls training itself (ADR-0002/0004 keep the seams separate); the web
 * handler composes them, invoking the deterministic `buildRoadmap` from
 * `@puente/training` only when the exploration actually reported a no-match
 * (`result.noMatch` is present) **and** the candidate declared willingness to
 * train. A result with no `noMatch` — including one whose `matches` is empty only
 * because a caller passed `limit: 0` — never builds a roadmap.
 */
export async function handleRoadmap(payload: unknown, deps: RoadmapHandlerDeps = {}): Promise<HandlerResult> {
  if (!validateExplorationResult(payload)) {
    return { status: 400, body: { error: 'invalid_exploration_result' } };
  }
  const result = payload as ExplorationResult;
  const noMatch = result.noMatch;

  if (!noMatch) {
    return { status: 200, body: { roadmap: null, gaps: [], reason: 'viable_match_exists' } };
  }
  if (!noMatch.roadmapRequested) {
    return { status: 200, body: { roadmap: null, gaps: [], reason: 'candidate_declined_training' } };
  }

  const stored = (deps.profileStore ?? profileStore).get(result.candidateId);
  const profile = stored ?? (deps.loadProfile
    ? await deps.loadProfile(result.candidateId)
    : deps.profileStore
      ? undefined
      : await readCandidateProfile(result.candidateId));
  if (!profile) return { status: 409, body: { error: 'profile_required' } };

  const vacancy = noMatch.nearMatches[0]?.vacancy;
  if (!vacancy) return { status: 409, body: { error: 'near_match_required' } };
  const input = vacancyInput(vacancy);
  const context = candidateContext(result.preferences);
  const service = deps.service ?? matchingService();
  const decision = await service.evaluatePair(profile, context, input, deps.now ? { now: deps.now } : {});
  const gaps = deriveGaps({
    candidate: toSolverCandidate(profile, context, DEFAULT_GEO_POINT),
    vacancy: toSolverVacancy(input.document, input.context, DEFAULT_GEO_POINT),
  });
  const catalog = deps.trainingCatalog ?? createSeedTrainingCatalog();
  const roadmap: Roadmap = await buildRoadmap(
    {
      candidateId: result.candidateId,
      aptitude: decision.aptitude,
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
    { now: deps.now, routing: deps.routing },
  );

  return { status: 200, body: { roadmap, gaps, reason: 'no_viable_match' } };
}
