import type { CandidatePreferences, CandidateProfile, JobRequirements, Requirement } from '@puente/domain';
import { matchVacancySkill } from '@puente/domain';
import { createSeedCatalog, type CachedVacancy } from '@puente/catalog';
import {
  createMatchingService,
  matchingConfigFromEnv,
  type CandidateMatchContext,
  type MatchingService,
  type VacancyMatchInput,
} from '@puente/agent-runtime';
import type { MatchDecision } from '@puente/solver';
import { readCandidatePreferences, readCandidateProfile } from './neon-repository';
import type { HandlerResult } from './handler-result';

export interface MatchHandlerDeps {
  profile?: CandidateProfile;
  preferences?: CandidatePreferences;
  service?: MatchingService;
  catalog?: ReturnType<typeof createSeedCatalog>;
  now?: () => Date;
}

export interface MatchResponse {
  decisions: MatchDecision[];
  /** Version used by clients to invalidate their decision cache. */
  preferencesVersion: string;
}

const cache = new Map<string, MatchResponse>();

function requirement(vacancy: CachedVacancy, skill: CachedVacancy['skills'][number], index: number): Requirement {
  const canonical = skill.skillId ? matchVacancySkill(skill.skillId) : matchVacancySkill(skill.labelEs);
  return {
    id: `${vacancy.jobId}-requirement-${index + 1}`,
    kind: 'skill',
    category: skill.required ? 'mandatory' : 'desirable',
    originalWording: skill.labelEs,
    normalizedWording: skill.labelEs,
    canonical,
    level: 1,
    justification: null,
    alertId: null,
    rankingEligible: true,
    excludedFromRanking: false,
  };
}

function vacancyInput(vacancy: CachedVacancy): VacancyMatchInput {
  const requirements = vacancy.skills.map((skill, index) => requirement(vacancy, skill, index));
  const document: JobRequirements = {
    schemaVersion: '1.0.0', vacancyId: vacancy.jobId, title: vacancy.title, employer: vacancy.company,
    source: 'json', capturedAt: vacancy.queriedAt, locale: 'es-PA', taxonomyVersion: 'panama-v1',
    status: 'accepted', location: vacancy.location, requirements, alerts: [], reviewQueue: [],
    blockingReasons: [], metadata: { inputKind: 'json', extractor: 'catalog', extractedAt: vacancy.queriedAt,
      rawText: null, requirementCount: requirements.length, mandatoryCount: requirements.filter((r) => r.category === 'mandatory').length,
      desirableCount: requirements.filter((r) => r.category === 'desirable').length, alertCount: 0, excludedCount: 0 },
  };
  return { document, context: { schedule: { days: vacancy.schedule.days, startMinute: vacancy.schedule.startMinute, endMinute: vacancy.schedule.endMinute, weeklyHours: vacancy.schedule.weeklyHours },
    salaryMinUsd: vacancy.salary.minUsd ?? 0, salaryMaxUsd: vacancy.salary.maxUsd ?? vacancy.salary.minUsd ?? 0, capacity: 1 } };
}

function candidateContext(preferences: CandidatePreferences): CandidateMatchContext {
  return { home: preferences.max_location, availability: { days: preferences.availability.days, startMinute: preferences.availability.start_minute, endMinute: preferences.availability.end_minute, weeklyHours: preferences.availability.weekly_hours },
    transport: { hasVehicle: preferences.transport_modes.includes('driving'), maxCommuteMinutes: preferences.max_travel_minutes, modes: preferences.transport_modes },
    expectedSalaryUsd: preferences.minimum_salary_usd, minimumSalaryUsd: preferences.minimum_salary_usd };
}

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
  const service = deps.service ?? createMatchingService({ ...matchingConfigFromEnv({
    GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY,
    GOOGLE_MAPS_ENDPOINT: process.env.GOOGLE_MAPS_ENDPOINT,
    GOOGLE_GEOCODING_ENDPOINT: process.env.GOOGLE_GEOCODING_ENDPOINT,
  }), warnings: [] });
  const decisions = await Promise.all(vacancies.map((vacancy) => service.evaluatePair(profile, candidateContext(preferences), vacancy, deps.now ? { now: deps.now } : {})));
  const response = { decisions, preferencesVersion: version };
  cache.set(key, response);
  return { status: 200, body: response };
}

export function clearMatchCache(): void { cache.clear(); }
