import { describe, expect, it } from 'vitest';
import { createVacancyCatalog, toCachedVacancy, validateExplorationResult, type CachedVacancy } from '@workbridge/catalog';
import type { CandidatePreferences } from '@workbridge/domain';
import { createExplorationAgent } from '../src/exploration/exploration-agent';

const NOW = () => new Date('2026-10-16T12:00:00.000Z');

const preferences: CandidatePreferences = {
  schema_version: '1.0.0',
  preferences_id: 'pref_agent_1',
  candidate_id: 'candidate_agent_1',
  locale: 'es-PA',
  origin: 'candidate_explicit',
  created_at: '2026-10-16T11:00:00.000Z',
  updated_at: '2026-10-16T11:00:00.000Z',
  target_roles: ['Atención al cliente'],
  modality: 'onsite',
  max_location: { country: 'PA', province: 'Panamá', district: 'Panamá', raw: 'Ciudad de Panamá' },
  max_travel_minutes: 60,
  monthly_transport_budget_usd: 40,
  minimum_salary_usd: 600,
  availability: { days: [1, 2, 3, 4, 5], start_minute: 480, end_minute: 1020, weekly_hours: 40 },
  contract_types: ['full_time'],
  transport_modes: ['transit', 'walking'],
  willing_to_train: true,
  willing_to_intern: false,
};

function vacancy(jobId: string, postedAt: string): CachedVacancy {
  return toCachedVacancy(
    {
      jobId,
      jobUrl: `https://example.com/jobs/${jobId}`,
      title: 'Agente de servicio',
      postedAt,
      queriedAt: '2026-10-16T10:00:00.000Z',
      scrapingInfo: { provider: 'apify_linkedin_jobs', query: 'servicio', scrapedAt: '2026-10-16T10:00:00.000Z' },
      salary: { minUsd: 700, maxUsd: 900 },
      skills: [{ skillId: 'plp:customer-service', labelEs: 'Atención al cliente', labelEn: null, required: true }],
    },
    { now: NOW },
  );
}

describe('ExplorationAgent', () => {
  it('returns compatible cached vacancies with provenance and freshness', async () => {
    const catalog = createVacancyCatalog([vacancy('lnk-a', '2026-10-16T09:00:00.000Z')]);
    const agent = createExplorationAgent({ catalog, now: NOW });
    const result = await agent.run(preferences);
    expect(validateExplorationResult(result)).toBe(true);
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0]!.provenance.provider).toBe('apify_linkedin_jobs');
    expect(result.matches[0]!.freshness.stale).toBe(false);
  });

  it('never recommends a vacancy older than 72 hours', async () => {
    const catalog = createVacancyCatalog([vacancy('lnk-old', '2026-10-12T09:00:00.000Z')]);
    const agent = createExplorationAgent({ catalog, now: NOW });
    const result = await agent.run(preferences);
    expect(result.matches).toHaveLength(0);
    expect(result.summary.stale).toBe(1);
  });

  it('rejects preferences that are not explicitly captured', async () => {
    const catalog = createVacancyCatalog([vacancy('lnk-a', '2026-10-16T09:00:00.000Z')]);
    const agent = createExplorationAgent({ catalog, now: NOW });
    await expect(agent.run({ ...preferences, origin: 'inferred' })).rejects.toThrow();
  });
});
