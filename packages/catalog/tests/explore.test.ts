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

const NOW = () => new Date('2026-11-01T00:00:00.000Z');
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
    expect(match.freshness.ageHours).toBe(15);
    expect(match.freshness.stale).toBe(false);
    expect(match.freshness.label).toBe('Publicada hace 15 horas');
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
        postedAt: '2026-10-31T09:00:00.000Z',
        queriedAt: '2026-10-31T10:00:00.000Z',
        scrapingInfo: { provider: 'seed', query: 'pasantia', scrapedAt: '2026-10-31T10:00:00.000Z' },
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
        postedAt: '2026-10-31T09:00:00.000Z',
        queriedAt: '2026-10-31T10:00:00.000Z',
        scrapingInfo: { provider: 'seed', query: 'ventas', scrapedAt: '2026-10-31T10:00:00.000Z' },
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

describe('exploreVacancies — no match, causes and near matches', () => {
  it('records every failed constraint so a single-constraint failure is distinguishable', () => {
    const result = exploreVacancies(preferences, catalog, { now: NOW });

    // lnk-1005 is an internship below the salary floor: two constraints, not near.
    const blocked = result.excluded.find((entry) => entry.jobId === 'lnk-1005')!;
    expect(blocked.reason).toBe('contract');
    expect(blocked.failedConstraints.map((failure) => failure.reason).sort()).toEqual(['contract', 'salary']);
    // Each failed constraint carries its own explanation, not the primary one.
    expect(new Set(blocked.failedConstraints.map((failure) => failure.detail)).size).toBe(2);
  });

  it('names each cause and lists only single-constraint near matches, with warnings', () => {
    const strict: CandidatePreferences = {
      ...preferences,
      max_location: { country: 'PA', province: 'Bocas del Toro', district: null, raw: 'Bocas del Toro' },
    };
    const result = exploreVacancies(strict, catalog, { now: NOW });
    expect(result.matches).toHaveLength(0);
    expect(validateExplorationResult(result)).toBe(true);

    const noMatch = result.noMatch!;
    expect(noMatch.causes.length).toBeGreaterThan(0);
    // Every failed constraint is surfaced as a cause, with the exact count.
    for (const cause of noMatch.causes) {
      const failing = result.excluded.filter((entry) =>
        entry.failedConstraints.some((failure) => failure.reason === cause.reason),
      );
      expect(cause.count).toBe(failing.length);
      expect(cause.count).toBeGreaterThan(0);
    }
    // Causes name constraints that are *not* any vacancy's primary reason
    // (lnk-1002's contract failure), proving secondary causes are not hidden.
    expect(noMatch.causes.map((cause) => cause.reason)).toContain('contract');

    // Every near match is blocked by exactly one constraint and warns about it.
    for (const near of noMatch.nearMatches) {
      const entry = result.excluded.find((excluded) => excluded.jobId === near.vacancy.jobId)!;
      expect(entry.failedConstraints).toHaveLength(1);
      expect(near.blockedBy).toBe(entry.failedConstraints[0]!.reason);
      expect(near.warnings[0]).toContain('Bloqueada por');
    }
    expect(noMatch.nearMatches.length).toBeLessThanOrEqual(5);
  });

  it('blames staleness, not restrictions, when the whole catalogue is stale', () => {
    const staleRecords = (catalogFixture as CachedVacancy[]).map((record) => ({
      ...record,
      postedAt: '2026-01-01T00:00:00.000Z',
    }));
    const staleCatalog = createVacancyCatalog(staleRecords);
    const result = exploreVacancies(preferences, staleCatalog, { now: NOW });

    expect(result.matches).toHaveLength(0);
    const noMatch = result.noMatch!;
    expect(noMatch.causes).toHaveLength(1);
    expect(noMatch.causes[0]!.reason).toBe('stale');
    expect(noMatch.causes[0]!.count).toBe(staleRecords.length);
    expect(noMatch.explanation).toContain('Desactualizada');
  });

  it('does not fabricate a no-match when a limit truncates real matches (T-E)', () => {
    const result = exploreVacancies(preferences, catalog, { now: NOW, limit: 0 });
    expect(result.matches).toHaveLength(0);
    expect(result.noMatch).toBeUndefined();
  });

  it('honours a caller-supplied near-match limit', () => {
    const strict: CandidatePreferences = {
      ...preferences,
      max_location: { country: 'PA', province: 'Bocas del Toro', district: null, raw: 'Bocas del Toro' },
    };
    const result = exploreVacancies(strict, catalog, { now: NOW, nearMatchLimit: 1 });
    expect(result.noMatch!.nearMatches.length).toBeLessThanOrEqual(1);
  });
});
