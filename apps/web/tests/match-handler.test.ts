import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CandidatePreferences, CandidateProfile } from '@puente/domain';
import type { MatchDecision } from '@puente/solver';
import { createSeedCatalog } from '@puente/catalog';
import { clearMatchCache, handleMatch } from '../lib/match-handler';

const candidateId = 'candidate_match_handler';
const preferences: CandidatePreferences = {
  schema_version: '1.0.0', preferences_id: 'preferences_match_handler', candidate_id: candidateId,
  locale: 'es-PA', origin: 'candidate_explicit', created_at: '2026-10-16T12:00:00.000Z', updated_at: 'v1',
  target_roles: ['Atención al cliente'], modality: 'onsite',
  max_location: { country: 'PA', province: 'Panamá', district: 'Panamá', raw: 'Panamá, Panamá' },
  max_travel_minutes: 60, monthly_transport_budget_usd: 40, minimum_salary_usd: 600,
  availability: { days: [1, 2, 3, 4, 5], start_minute: 480, end_minute: 1020, weekly_hours: 40 },
  contract_types: ['full_time'], transport_modes: ['transit'], willing_to_train: true, willing_to_intern: false,
};
const profile: CandidateProfile = {
  schema_version: '1.0.0', candidate_id: candidateId, locale: 'es-PA', created_at: '2026-10-16T12:00:00.000Z',
  updated_at: '2026-10-16T12:00:00.000Z', sources: [], skills: [], experiences: [], education: [], certifications: [], evidence: [], trace_id: 'trace_match_handler',
};

afterEach(() => clearMatchCache());

function decision(vacancyId: string): MatchDecision {
  return { vacancyId, score: 73 } as MatchDecision;
}

describe('handleMatch', () => {
  it('evaluates the requested vacancies and caches the same preference version', async () => {
    const [firstVacancy, secondVacancy] = createSeedCatalog().all();
    const service = { evaluatePair: vi.fn(async (_profile: CandidateProfile, _context: unknown, vacancy: { document: { vacancyId: string } }) => decision(vacancy.document.vacancyId)) };

    const first = await handleMatch({ vacancyIds: [firstVacancy!.jobId, secondVacancy!.jobId] }, { profile, preferences, service: service as never });
    const second = await handleMatch({ vacancyIds: [firstVacancy!.jobId, secondVacancy!.jobId] }, { profile, preferences, service: service as never });

    expect(first.status).toBe(200);
    expect((first.body as { decisions: MatchDecision[] }).decisions.map((item) => item.vacancyId)).toEqual([firstVacancy!.jobId, secondVacancy!.jobId]);
    expect(second.body).toBe(first.body);
    expect(service.evaluatePair).toHaveBeenCalledTimes(2);
  });

  it('invalidates the cache when preferences change', async () => {
    const [vacancy] = createSeedCatalog().all();
    const service = { evaluatePair: vi.fn(async () => decision(vacancy!.jobId)) };
    await handleMatch({ vacancyIds: [vacancy!.jobId] }, { profile, preferences, service: service as never });
    await handleMatch({ vacancyIds: [vacancy!.jobId] }, { profile, preferences: { ...preferences, updated_at: 'v2' }, service: service as never });

    expect(service.evaluatePair).toHaveBeenCalledTimes(2);
  });
});
