import { describe, expect, it } from 'vitest';
import {
  CatalogContractError,
  assertCachedVacancy,
  createVacancyCatalog,
  loadCatalogFromScraped,
  toCachedVacancy,
  validateCachedVacancy,
  validateExplorationResult,
} from '../src/index';
import type { CachedVacancy, RawScrapedVacancy } from '../src/index';
import catalogFixture from '../fixtures/vacancy-catalog.json';

const records = catalogFixture as CachedVacancy[];
const NOW = () => new Date('2026-10-16T12:00:00.000Z');

const rawRecord: RawScrapedVacancy = {
  jobId: 'lnk-2001',
  jobUrl: 'https://www.linkedin.com/jobs/view/lnk-2001',
  title: 'Recepcionista',
  company: 'Hotel Bahía',
  postedAt: '2026-10-16T09:00:00.000Z',
  queriedAt: '2026-10-16T10:00:00.000Z',
  scrapingInfo: {
    provider: 'apify_linkedin_jobs',
    query: 'recepcionista panama',
    scrapedAt: '2026-10-16T10:00:00.000Z',
    runId: 'run_xyz',
    sourceJobId: 'linkedin:lnk-2001',
  },
  location: 'Ciudad de Panamá',
  skills: ['Atención al cliente'],
};

describe('toCachedVacancy', () => {
  it('preserves jobUrl, jobId, query date, and scrapingInfo', () => {
    const vacancy = toCachedVacancy(rawRecord, { now: NOW });
    expect(vacancy.jobId).toBe('lnk-2001');
    expect(vacancy.jobUrl).toBe('https://www.linkedin.com/jobs/view/lnk-2001');
    expect(vacancy.queriedAt).toBe('2026-10-16T10:00:00.000Z');
    expect(vacancy.scrapingInfo).toEqual(rawRecord.scrapingInfo);
    expect(vacancy.provenance.sourceUrl).toBe(vacancy.jobUrl);
    expect(validateCachedVacancy(vacancy)).toBe(true);
  });

  it('normalizes a bare scraped skill and a string location', () => {
    const vacancy = toCachedVacancy(rawRecord, { now: NOW });
    expect(vacancy.skills[0]).toEqual({ skillId: null, labelEs: 'Atención al cliente', labelEn: null, required: true });
    expect(vacancy.location).toEqual({ country: 'PA', province: null, district: null, raw: 'Ciudad de Panamá' });
  });

  it('defaults queriedAt to now when the scraper did not provide it', () => {
    const { queriedAt: _omit, ...withoutQueryDate } = rawRecord;
    const vacancy = toCachedVacancy(withoutQueryDate, { now: NOW });
    expect(vacancy.queriedAt).toBe('2026-10-16T12:00:00.000Z');
  });
});

describe('createVacancyCatalog', () => {
  it('validates every record against the contract', () => {
    expect(() => assertCachedVacancy(records[0])).not.toThrow();
    const catalog = createVacancyCatalog(records);
    expect(catalog.size()).toBe(records.length);
  });

  it('rejects an invalid record before it enters the catalogue', () => {
    const invalid = { ...records[0], jobUrl: 'not-a-url' } as CachedVacancy;
    expect(() => createVacancyCatalog([invalid])).toThrow(CatalogContractError);
  });

  it('deduplicates by jobId keeping the most recently queried copy', () => {
    const older: CachedVacancy = { ...records[0]!, queriedAt: '2026-10-10T00:00:00.000Z', title: 'Vieja' };
    const newer: CachedVacancy = { ...records[0]!, queriedAt: '2026-10-16T00:00:00.000Z', title: 'Nueva' };
    const catalog = createVacancyCatalog([older, newer]);
    expect(catalog.size()).toBe(1);
    expect(catalog.get('lnk-1001')?.title).toBe('Nueva');
  });
});

describe('loadCatalogFromScraped', () => {
  it('normalizes a raw payload and preserves provenance', () => {
    const catalog = loadCatalogFromScraped([rawRecord], { now: NOW });
    expect(catalog.size()).toBe(1);
    expect(catalog.get('lnk-2001')?.scrapingInfo.runId).toBe('run_xyz');
  });

  it('rejects a non-array payload', () => {
    expect(() => loadCatalogFromScraped({} as unknown as RawScrapedVacancy[])).toThrow();
  });
});

describe('exploration result schema registry', () => {
  it('is registered and rejects an empty object', () => {
    expect(validateExplorationResult({})).toBe(false);
  });
});
