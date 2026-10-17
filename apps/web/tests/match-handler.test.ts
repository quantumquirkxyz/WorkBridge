import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CandidatePreferences, CandidateProfile } from '@workbridge/domain';
import type { MatchDecision } from '@workbridge/solver';
import { createSeedCatalog } from '@workbridge/catalog';
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
  return {
    schemaVersion: '1.0.0',
    candidateId,
    vacancyId,
    aptitude: 'apt_with_gaps',
    score: 73,
    baseScore: 73,
    scoreBreakdown: [
      { dimension: 'technical', weight: 0.3, rawScore: 73, weightedScore: 21.9, reasons: [] },
      { dimension: 'experience', weight: 0.25, rawScore: 73, weightedScore: 18.25, reasons: [] },
      { dimension: 'availability', weight: 0.15, rawScore: 73, weightedScore: 10.95, reasons: [] },
      { dimension: 'transport', weight: 0.2, rawScore: 73, weightedScore: 14.6, reasons: [] },
      { dimension: 'salary', weight: 0.1, rawScore: 73, weightedScore: 7.3, reasons: [] },
    ],
    hardConstraints: [],
    failedConstraints: [],
    reasons: ['Encaja en parte'],
    tieBreakKey: `tie-${vacancyId}`,
    promotion: { eligible: false, applied: false, requiresHumanApproval: false, reason: 'Sin promoción' },
    routing: { commuteMinutes: 20, distanceKm: 5, accessible: true, source: 'local_matrix' },
    decidedAt: '2026-10-16T12:00:00.000Z',
  };
}

describe('handleMatch', () => {
  it('evaluates the requested vacancies and caches the same preference version', async () => {
    const [firstVacancy, secondVacancy] = createSeedCatalog().all();
    const service = { evaluatePair: vi.fn(async (_profile: CandidateProfile, _context: unknown, vacancy: { document: { vacancyId: string } }) => decision(vacancy.document.vacancyId)) };

    const first = await handleMatch({ vacancyIds: [firstVacancy!.jobId, secondVacancy!.jobId] }, { profile, preferences, service: service as never });
    const second = await handleMatch({ vacancyIds: [firstVacancy!.jobId, secondVacancy!.jobId] }, { profile, preferences, service: service as never });

    expect(first.status).toBe(200);
    const body = first.body as { decisions: MatchDecision[]; applicationDecisions: { vacancyId: string; traceId: string; score: { weightedTotal: number } }[] };
    expect(body.decisions.map((item) => item.vacancyId)).toEqual([firstVacancy!.jobId, secondVacancy!.jobId]);
    expect(body.applicationDecisions.map((item) => item.vacancyId)).toEqual([firstVacancy!.jobId, secondVacancy!.jobId]);
    expect(body.applicationDecisions[0]?.score.weightedTotal).toBe(73);
    expect(body.applicationDecisions[0]?.traceId).toEqual(expect.any(String));
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
