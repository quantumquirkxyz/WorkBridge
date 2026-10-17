import { describe, expect, it, vi } from 'vitest';
import type { CandidatePreferences } from '@puente/domain';
import {
  createSeedCatalog,
  exploreVacancies,
  type ExplorationResult,
} from '@puente/catalog';
import { handleRoadmap, deriveAdvisoryGaps } from '../lib/roadmap-handler';
import preferencesFixture from '../../../packages/catalog/fixtures/preferences.json';

const NOW = () => new Date('2026-10-16T12:00:00.000Z');
const preferences = preferencesFixture as CandidatePreferences;

const noMatchResult = exploreVacancies(
  { ...preferences, max_location: { country: 'PA', province: 'Bocas del Toro', district: null, raw: 'Bocas del Toro' } },
  createSeedCatalog(),
  { now: NOW },
);

describe('handleRoadmap', () => {
  it('builds a real roadmap from the training seam when there is no viable match', () => {
    expect(noMatchResult.matches).toHaveLength(0);
    const { status, body } = handleRoadmap(noMatchResult, { now: NOW });
    expect(status).toBe(200);
    const { roadmap, gaps } = body as { roadmap: { aptitude: string; recommendations: unknown[]; catalogVersion: string } | null; gaps: unknown[] };
    expect(gaps.length).toBeGreaterThan(0);
    expect(roadmap).not.toBeNull();
    expect(roadmap!.aptitude).toBe('not_currently_apt');
    expect(typeof roadmap!.catalogVersion).toBe('string');
    expect(roadmap!.recommendations.length).toBeGreaterThan(0);
  });

  it('does not build a roadmap when a viable match exists', () => {
    const matched = exploreVacancies(preferences, createSeedCatalog(), { now: NOW });
    expect(matched.matches.length).toBeGreaterThan(0);
    const { status, body } = handleRoadmap(matched, { now: NOW });
    expect(status).toBe(200);
    expect(body).toMatchObject({ roadmap: null, reason: 'viable_match_exists' });
  });

  it('keys off noMatch, not the match array, and honours the training opt-in', () => {
    // A result truncated by `limit: 0` has no `noMatch` and must build nothing.
    const truncated = exploreVacancies(preferences, createSeedCatalog(), { now: NOW, limit: 0 });
    expect(truncated.matches).toHaveLength(0);
    expect(truncated.noMatch).toBeUndefined();
    expect(handleRoadmap(truncated, { now: NOW }).body).toMatchObject({
      roadmap: null,
      reason: 'viable_match_exists',
    });

    // A candidate who declined training gets no roadmap either.
    const declined = { ...noMatchResult, noMatch: { ...noMatchResult.noMatch!, roadmapRequested: false } };
    expect(handleRoadmap(declined, { now: NOW }).body).toMatchObject({
      roadmap: null,
      reason: 'candidate_declined_training',
    });
  });

  it('rejects a payload that is not an exploration result', () => {
    expect(handleRoadmap({ nope: true }).status).toBe(400);
    expect(handleRoadmap(null).status).toBe(400);
  });
});

describe('deriveAdvisoryGaps', () => {
  it('maps the required skills of near matches onto taxonomy ids, deduplicated', () => {
    const gaps = deriveAdvisoryGaps(noMatchResult);
    const ids = gaps.map((gap) => gap.skillId);
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
    for (const gap of gaps) {
      expect(gap.label).toBeTruthy();
      expect(gap.mandatory).toBe(true);
    }
  });

  it('returns no gaps when there is no noMatch block', () => {
    const empty = { ...noMatchResult, noMatch: undefined } as ExplorationResult;
    expect(deriveAdvisoryGaps(empty)).toEqual([]);
  });
});

describe('no external submission', () => {
  it('does not reach the network while building a roadmap', () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('no network in test'));
    try {
      handleRoadmap(noMatchResult, { now: NOW });
      expect(spy).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });
});
