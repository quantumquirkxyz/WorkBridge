import { describe, expect, it } from 'vitest';
import { computeFreshness, DEFAULT_MAX_AGE_HOURS, InvalidVacancyError, toCachedVacancy } from '../src/index';
import type { CachedVacancy } from '../src/index';
import catalogFixture from '../fixtures/vacancy-catalog.json';

const NOW = new Date('2026-11-01T00:00:00.000Z');
const records = catalogFixture as CachedVacancy[];

function byId(jobId: string): CachedVacancy {
  const found = records.find((vacancy) => vacancy.jobId === jobId);
  if (!found) throw new Error(`fixture ${jobId} missing`);
  return found;
}

describe('computeFreshness', () => {
  it('exposes the 72-hour default as a named constant', () => {
    expect(DEFAULT_MAX_AGE_HOURS).toBe(72);
  });

  it('labels a fresh vacancy in Spanish', () => {
    const freshness = computeFreshness(byId('lnk-1001'), { now: NOW });
    expect(freshness.ageHours).toBe(15);
    expect(freshness.stale).toBe(false);
    expect(freshness.label).toBe('Publicada hace 15 horas');
  });

  it('marks a vacancy older than 72 hours as stale', () => {
    const freshness = computeFreshness(byId('lnk-1004'), { now: NOW });
    expect(freshness.ageHours).toBe(468);
    expect(freshness.stale).toBe(true);
    expect(freshness.label).toContain('fuera del límite de 72 h');
  });

  it('clamps a future postedAt to age 0 rather than a negative age', () => {
    const future = toCachedVacancy({
      jobId: 'lnk-future',
      jobUrl: 'https://example.com/jobs/future',
      title: 'Futuro',
      postedAt: '2026-11-01T06:00:00.000Z',
      scrapingInfo: { provider: 'seed', query: 'future', scrapedAt: '2026-11-01T00:00:00.000Z' },
    });
    const freshness = computeFreshness(future, { now: NOW });
    expect(freshness.ageHours).toBe(0);
    expect(freshness.stale).toBe(false);
  });

  it('rejects an invalid postedAt', () => {
    const broken = { ...byId('lnk-1001'), postedAt: 'ayer' } as CachedVacancy;
    expect(() => computeFreshness(broken, { now: NOW })).toThrow(InvalidVacancyError);
  });
});
