import { describe, expect, it, vi } from 'vitest';
import type { CandidatePreferences } from '@puente/domain';
import type { CandidateProfile } from '@puente/domain';
import {
  createSeedCatalog,
  exploreVacancies,
  type ExplorationResult,
} from '@puente/catalog';
import { handleRoadmap, deriveAdvisoryGaps } from '../lib/roadmap-handler';
import { createInMemoryProfileStore } from '../lib/profile-store';
import preferencesFixture from '../../../packages/catalog/fixtures/preferences.json';

const NOW = () => new Date('2026-10-16T12:00:00.000Z');
const preferences = preferencesFixture as CandidatePreferences;

const noMatchResult = exploreVacancies(
  { ...preferences, max_location: { country: 'PA', province: 'Bocas del Toro', district: null, raw: 'Bocas del Toro' } },
  createSeedCatalog(),
  { now: NOW },
);

const profile: CandidateProfile = {
  schema_version: '1.0.0', candidate_id: noMatchResult.candidateId, locale: 'es-PA',
  created_at: '2026-10-16T12:00:00.000Z', updated_at: '2026-10-16T12:00:00.000Z',
  sources: [], skills: [], experiences: [], education: [], certifications: [], evidence: [], trace_id: 'trace-roadmap',
};

function solverDeps() {
  const profiles = createInMemoryProfileStore();
  profiles.save(profile);
  const service = {
    evaluatePair: vi.fn(async () => ({ aptitude: 'apt_with_gaps' as const })),
  };
  return { profileStore: profiles, service: service as never };
}

describe('handleRoadmap', () => {
  it('builds a real roadmap from the training seam when there is no viable match', async () => {
    expect(noMatchResult.matches).toHaveLength(0);
    const deps = solverDeps();
    const { status, body } = await handleRoadmap(noMatchResult, { now: NOW, ...deps });
    expect(status).toBe(200);
    const { roadmap, gaps } = body as { roadmap: { aptitude: string; recommendations: unknown[]; catalogVersion: string } | null; gaps: { skillId: string }[] };
    expect(gaps.length).toBeGreaterThan(0);
    expect(gaps.map((gap) => gap.skillId)).toEqual(['PA-CS-0001', 'PA-SOFT-0003']);
    expect(roadmap).not.toBeNull();
    expect(roadmap!.aptitude).toBe('apt_with_gaps');
    expect(typeof roadmap!.catalogVersion).toBe('string');
    expect(roadmap!.recommendations.length).toBeGreaterThan(0);
    expect((deps.service as unknown as { evaluatePair: ReturnType<typeof vi.fn> }).evaluatePair).toHaveBeenCalledTimes(1);
  });

  it('requires a stored profile before invoking the solver or roadmap builder', async () => {
    const service = { evaluatePair: vi.fn() };
    const result = await handleRoadmap(noMatchResult, {
      now: NOW,
      service: service as never,
      profileStore: createInMemoryProfileStore(),
    });
    expect(result).toEqual({ status: 409, body: { error: 'profile_required' } });
    expect(service.evaluatePair).not.toHaveBeenCalled();
  });

  it('preserves canonical vacancy skill ids when the display label is not mappable', async () => {
    const result = structuredClone(noMatchResult);
    result.noMatch!.nearMatches[0]!.vacancy.skills[0] = {
      ...result.noMatch!.nearMatches[0]!.vacancy.skills[0]!,
      skillId: 'plp:customer-service',
      labelEs: 'Etiqueta no catalogada',
    };
    const { body } = await handleRoadmap(result, { now: NOW, ...solverDeps() });
    expect((body as { gaps: { skillId: string }[] }).gaps.map((gap) => gap.skillId)).toContain('PA-CS-0001');
  });

  it('loads a persisted profile when the injected store has no profile', async () => {
    const service = { evaluatePair: vi.fn(async () => ({ aptitude: 'not_currently_apt' as const })) };
    const loadProfile = vi.fn(async () => profile);
    const { status } = await handleRoadmap(noMatchResult, {
      now: NOW,
      service: service as never,
      profileStore: createInMemoryProfileStore(),
      loadProfile,
    });
    expect(status).toBe(200);
    expect(loadProfile).toHaveBeenCalledWith(noMatchResult.candidateId);
    expect(service.evaluatePair).toHaveBeenCalledTimes(1);
  });

  it('retains a valid canonical vacancy id when its label is not mappable', async () => {
    const result = structuredClone(noMatchResult);
    result.noMatch!.nearMatches[0]!.vacancy.skills[0] = {
      ...result.noMatch!.nearMatches[0]!.vacancy.skills[0]!,
      skillId: 'PA-CS-0001',
      labelEs: 'Etiqueta no catalogada',
    };
    const { body } = await handleRoadmap(result, { now: NOW, ...solverDeps() });
    expect((body as { gaps: { skillId: string }[] }).gaps.map((gap) => gap.skillId)).toContain('PA-CS-0001');
  });

  it('does not build a roadmap when a viable match exists', async () => {
    const matched = exploreVacancies(preferences, createSeedCatalog(), { now: NOW });
    expect(matched.matches.length).toBeGreaterThan(0);
    const service = { evaluatePair: vi.fn() };
    const { status, body } = await handleRoadmap(matched, { now: NOW, service: service as never });
    expect(status).toBe(200);
    expect(body).toMatchObject({ roadmap: null, reason: 'viable_match_exists' });
    expect(service.evaluatePair).not.toHaveBeenCalled();
  });

  it('keys off noMatch, not the match array, and honours the training opt-in', async () => {
    // A result truncated by `limit: 0` has no `noMatch` and must build nothing.
    const truncated = exploreVacancies(preferences, createSeedCatalog(), { now: NOW, limit: 0 });
    expect(truncated.matches).toHaveLength(0);
    expect(truncated.noMatch).toBeUndefined();
    expect((await handleRoadmap(truncated, { now: NOW })).body).toMatchObject({
      roadmap: null,
      reason: 'viable_match_exists',
    });

    // A candidate who declined training gets no roadmap either.
    const declined = { ...noMatchResult, noMatch: { ...noMatchResult.noMatch!, roadmapRequested: false } };
    expect((await handleRoadmap(declined, { now: NOW })).body).toMatchObject({
      roadmap: null,
      reason: 'candidate_declined_training',
    });
  });

  it('rejects a payload that is not an exploration result', async () => {
    expect((await handleRoadmap({ nope: true })).status).toBe(400);
    expect((await handleRoadmap(null)).status).toBe(400);
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
  it('does not reach the network while building a roadmap', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('no network in test'));
    try {
      await handleRoadmap(noMatchResult, { now: NOW, ...solverDeps() });
      expect(spy).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });
});
