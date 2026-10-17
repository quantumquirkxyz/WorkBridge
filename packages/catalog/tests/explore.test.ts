import { describe, expect, it } from 'vitest';
import type { CandidatePreferences } from '@puente/domain';
import {
  createVacancyCatalog,
  exploreVacancies,
  toCachedVacancy,
  validateExplorationResult,
} from '../src/index';
import type { CachedVacancy } from '../src/index';
import catalogFixture from '../fixtures/vacancy-catalog.json';
import preferencesFixture from '../fixtures/preferences.json';

const NOW = () => new Date('2026-10-16T12:00:00.000Z');
const records = catalogFixture as CachedVacancy[];
const preferences = preferencesFixture as CandidatePreferences;

const catalog = createVacancyCatalog(records);

function excludedReason(result: ReturnType<typeof exploreVacancies>, jobId: string) {
  return result.excluded.find((entry) => entry.jobId === jobId)?.reason;
}

describe('exploreVacancies', () => {
  it('produces an Ajv-valid ExplorationResult', () => {
    const result = exploreVacancies(preferences, catalog, { now: NOW });
    expect(validateExplorationResult(result)).toBe(true);
  });

  it('returns only the compatible vacancy, with provenance and a freshness label', () => {
    const result = exploreVacancies(preferences, catalog, { now: NOW });
    expect(result.matches.map((match) => match.vacancy.jobId)).toEqual(['lnk-1001']);

    const match = result.matches[0]!;
    expect(match.provenance.provider).toBe('apify_linkedin_jobs');
    expect(match.provenance.sourceUrl).toBe('https://www.linkedin.com/jobs/view/lnk-1001');
    expect(match.freshness.ageHours).toBe(3);
    expect(match.freshness.stale).toBe(false);
    expect(match.freshness.label).toBe('Publicada hace 3 horas');
    expect(match.matchReasons.some((reason) => reason.includes('Habilidades afines'))).toBe(true);
  });

  it('excludes vacancies older than 72 hours from automatic recommendation', () => {
    const result = exploreVacancies(preferences, catalog, { now: NOW });
    expect(excludedReason(result, 'lnk-1004')).toBe('stale');
    const stale = result.excluded.find((entry) => entry.jobId === 'lnk-1004')!;
    expect(stale.freshness.stale).toBe(true);
    expect(result.summary.stale).toBe(1);
    expect(result.matches.some((match) => match.vacancy.jobId === 'lnk-1004')).toBe(false);
  });

  it('reports a Spanish reason for every other exclusion', () => {
    const result = exploreVacancies(preferences, catalog, { now: NOW });
    expect(excludedReason(result, 'lnk-1002')).toBe('contract');
    expect(excludedReason(result, 'lnk-1003')).toBe('modality');
    expect(excludedReason(result, 'lnk-1005')).toBe('contract');
    expect(excludedReason(result, 'lnk-1006')).toBe('location');
    expect(result.summary).toEqual({ considered: 6, matched: 1, excluded: 5, stale: 1 });
    for (const entry of result.excluded) expect(entry.detail.length).toBeGreaterThan(0);
  });

  it('honours the internship willingness flag', () => {
    const internship = toCachedVacancy(
      {
        jobId: 'lnk-3001',
        jobUrl: 'https://example.com/jobs/lnk-3001',
        title: 'Pasantía administrativa',
        postedAt: '2026-10-16T09:00:00.000Z',
        queriedAt: '2026-10-16T10:00:00.000Z',
        scrapingInfo: { provider: 'seed', query: 'pasantia', scrapedAt: '2026-10-16T10:00:00.000Z' },
        contractType: 'internship',
        salary: { minUsd: 700, maxUsd: 800 },
        skills: [{ skillId: 'plp:customer-service', labelEs: 'Atención al cliente', labelEn: null, required: true }],
      },
      { now: NOW },
    );
    const withInternship = createVacancyCatalog([internship]);
    expect(exploreVacancies(preferences, withInternship, { now: NOW }).matches).toHaveLength(0);
    const willing: CandidatePreferences = {
      ...preferences,
      willing_to_intern: true,
      contract_types: [...preferences.contract_types, 'internship'],
    };
    expect(exploreVacancies(willing, withInternship, { now: NOW }).matches).toHaveLength(1);
  });

  it('orders matches deterministically by score then freshness then jobId', () => {
    const willing: CandidatePreferences = {
      ...preferences,
      contract_types: ['full_time', 'part_time'],
    };
    const result = exploreVacancies(willing, catalog, { now: NOW });
    expect(result.matches.map((match) => match.vacancy.jobId)).toEqual(['lnk-1001', 'lnk-1002']);
    const [first, second] = result.matches;
    expect(first!.matchScore).toBeGreaterThanOrEqual(second!.matchScore);
  });

  it('applies a result limit without changing the order', () => {
    const willing: CandidatePreferences = { ...preferences, contract_types: ['full_time', 'part_time'] };
    const result = exploreVacancies(willing, catalog, { now: NOW, limit: 1 });
    expect(result.matches.map((match) => match.vacancy.jobId)).toEqual(['lnk-1001']);
    expect(result.summary.matched).toBe(1);
  });

  it('accepts a vacancy with no published salary as a near match', () => {
    const noSalary = toCachedVacancy(
      {
        jobId: 'lnk-3002',
        jobUrl: 'https://example.com/jobs/lnk-3002',
        title: 'Promotor de ventas',
        postedAt: '2026-10-16T09:00:00.000Z',
        queriedAt: '2026-10-16T10:00:00.000Z',
        scrapingInfo: { provider: 'seed', query: 'ventas', scrapedAt: '2026-10-16T10:00:00.000Z' },
        skills: [{ skillId: 'plp:customer-service', labelEs: 'Atención al cliente', labelEn: null, required: true }],
      },
      { now: NOW },
    );
    const result = exploreVacancies(preferences, createVacancyCatalog([noSalary]), { now: NOW });
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0]!.matchReasons.some((reason) => reason.includes('Salario no publicado'))).toBe(true);
  });

  it('refuses preferences that were not explicitly captured', () => {
    const inferred = { ...preferences, origin: 'inferred' } as unknown as CandidatePreferences;
    expect(() => exploreVacancies(inferred, catalog, { now: NOW })).toThrow();
  });
});
