import { randomUUID } from 'node:crypto';
import type { CandidatePreferences, CandidateProfile, MatchDecision as ApplicationMatchDecision } from '@workbridge/domain';
import { createSeedCatalog, type CachedVacancy } from '@workbridge/catalog';
import {
  toApplicationMatchDecision,
  type MatchingService,
} from '@workbridge/agent-runtime';
import type { MatchDecision } from '@workbridge/solver';
import { readCandidatePreferences, readCandidateProfile } from './neon-repository';
import type { HandlerResult } from './handler-result';
import { candidateContext, matchingService, vacancyInput } from './matching-input';

export interface MatchHandlerDeps {
  profile?: CandidateProfile;
  preferences?: CandidatePreferences;
  service?: MatchingService;
  catalog?: ReturnType<typeof createSeedCatalog>;
  now?: () => Date;
}

export interface MatchResponse {
  decisions: MatchDecision[];
  /** Solver decisions projected onto the application-draft contract. */
  applicationDecisions: ApplicationMatchDecision[];
  /** Version used by clients to invalidate their decision cache. */
  preferencesVersion: string;
}

const cache = new Map<string, MatchResponse>();

export async function handleMatch(payload: unknown, deps: MatchHandlerDeps = {}): Promise<HandlerResult> {
  const body = payload && typeof payload === 'object' ? payload as { vacancyIds?: unknown } : {};
  const candidateId = deps.preferences?.candidate_id ?? deps.profile?.candidate_id;
  if (!candidateId) return { status: 400, body: { error: 'missing_candidate' } };
  const preferences = deps.preferences ?? await readCandidatePreferences(candidateId);
  const profile = deps.profile ?? await readCandidateProfile(candidateId);
  if (!preferences || !profile) return { status: 404, body: { error: 'candidate_profile_or_preferences_not_found' } };
  const catalog = deps.catalog ?? createSeedCatalog();
  const ids = Array.isArray(body.vacancyIds) ? body.vacancyIds.filter((id): id is string => typeof id === 'string') : catalog.all().map((v) => v.jobId);
  const vacancies = ids.map((id) => catalog.get(id)).filter((v): v is CachedVacancy => Boolean(v)).map(vacancyInput);
  const version = preferences.updated_at;
  const key = `${candidateId}:${version}:${ids.join(',')}`;
  const cached = cache.get(key);
  if (cached) return { status: 200, body: cached };
  const service = deps.service ?? matchingService();
  const evaluated = await Promise.all(vacancies.map(async (vacancy) => {
    const decision = await service.evaluatePair(profile, candidateContext(preferences), vacancy, deps.now ? { now: deps.now } : {});
    const traceId = randomUUID();
    return {
      decision,
      applicationDecision: toApplicationMatchDecision(decision, vacancy.document, {
        traceId,
        decisionId: `decision-${traceId}`,
      }),
    };
  }));
  const response = {
    decisions: evaluated.map((item) => item.decision),
    applicationDecisions: evaluated.map((item) => item.applicationDecision),
    preferencesVersion: version,
  };
  cache.set(key, response);
  return { status: 200, body: response };
}

export function clearMatchCache(): void { cache.clear(); }
