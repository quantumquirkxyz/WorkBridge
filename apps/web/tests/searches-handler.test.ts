import { describe, expect, it, vi } from 'vitest';
import type { CandidatePreferences, ExplorationResult } from '@puente/catalog';
import { createInMemoryPreferencesStore } from '../lib/preferences-store';
import { createInMemorySavedSearchesStore } from '../lib/saved-searches-store';
import { handleListSearches, handleMarkVacancyVisit, handleSaveSearch } from '../lib/searches-handler';
import { type PreferencesDraft } from '../lib/preferences';
import { createInMemoryVacancyVisitsStore } from '../lib/vacancy-visits-store';
import preferencesFixture from '../../../packages/catalog/fixtures/preferences.json';

const NOW = () => new Date('2026-10-16T12:00:00.000Z');
const preferences = preferencesFixture as CandidatePreferences;

function draft(): PreferencesDraft {
  const { schema_version: _v, preferences_id: _p, origin: _o, created_at: _c, updated_at: _u, ...rest } = preferences;
  return rest;
}

/** Minimal ExplorationResult carrying only the fields the searches handler reads. */
function resultWith(jobIds: string[], postedAt = '2026-10-16T11:00:00.000Z'): ExplorationResult {
  return {
    schemaVersion: '1.0.0',
    candidateId: preferences.candidate_id,
    generatedAt: '2026-10-16T12:00:00.000Z',
    preferences,
    matches: jobIds.map((jobId) => ({ vacancy: { jobId, postedAt } })),
    excluded: [],
    summary: { considered: jobIds.length, matched: jobIds.length, excluded: 0, stale: 0 },
  } as unknown as ExplorationResult;
}

describe('handleSaveSearch / handleListSearches', () => {
  it('saves a search, then flags matches that appeared afterwards as new', async () => {
    const searchesStore = createInMemorySavedSearchesStore();
    const preferencesStore = createInMemoryPreferencesStore();
    const agent = { run: vi.fn() };
    agent.run.mockResolvedValueOnce(resultWith(['a'])).mockResolvedValueOnce(resultWith(['a', 'b']));

    const save = await handleSaveSearch(
      { label: 'Atención al cliente', preferences: draft() },
      { agent, searchesStore, preferencesStore, now: NOW },
    );
    expect(save.status).toBe(201);
    const saved = save.body as { searchId: string; seenJobIds: string[]; candidateId: string };
    expect(saved.seenJobIds).toEqual(['a']);

    const list = await handleListSearches(saved.candidateId, { agent, searchesStore, preferencesStore, now: NOW });
    expect(list.status).toBe(200);
    const views = (list.body as { searches: Array<{ newSinceSaved: Array<{ vacancy: { jobId: string } }>; matches: unknown[] }> }).searches;
    expect(views).toHaveLength(1);
    expect(views[0]!.matches).toHaveLength(2);
    expect(views[0]!.newSinceSaved.map((match) => match.vacancy.jobId)).toEqual(['b']);
  });

  it('rejects a search with no label or an invalid preferences body', async () => {
    const searchesStore = createInMemorySavedSearchesStore();
    const missingLabel = await handleSaveSearch({ preferences: draft() }, { searchesStore, now: NOW });
    expect(missingLabel.status).toBe(400);

    const badPreferences = await handleSaveSearch(
      { label: 'x', preferences: { ...draft(), target_roles: [] } },
      { searchesStore, now: NOW },
    );
    expect(badPreferences.status).toBe(400);
    expect(badPreferences.body).toMatchObject({ error: 'invalid_preferences' });
  });

  it('rejects a missing candidate id when listing', async () => {
    expect((await handleListSearches('')).status).toBe(400);
  });

  it('returns matches newer than the previous visit and marks the visit', async () => {
    const visitsStore = createInMemoryVacancyVisitsStore();
    const searchesStore = createInMemorySavedSearchesStore();
    const agent = { run: vi.fn() };
    const refreshed = resultWith(['a', 'b'], '2026-10-17T09:00:00.000Z');
    (refreshed.matches[0]!.vacancy as { postedAt: string }).postedAt = '2026-10-16T11:00:00.000Z';
    agent.run.mockResolvedValueOnce(resultWith(['a'], '2026-10-16T11:00:00.000Z'))
      .mockResolvedValueOnce(refreshed)
      .mockResolvedValueOnce(resultWith(['a', 'b'], '2026-10-17T09:00:00.000Z'));
    await handleSaveSearch({ label: 'Nueva', preferences: draft() }, { agent, searchesStore, now: NOW });
    handleMarkVacancyVisit(preferences.candidate_id, {
      visitsStore,
      now: () => new Date('2026-10-16T12:00:00.000Z'),
    });
    const first = await handleListSearches(preferences.candidate_id, {
      agent,
      searchesStore,
      visitsStore,
      now: () => new Date('2026-10-17T10:00:00.000Z'),
    });
    expect((first.body as { searches: Array<{ newSinceLastVisit: Array<{ vacancy: { jobId: string } }> }> }).searches[0]!.newSinceLastVisit.map((match) => match.vacancy.jobId)).toEqual(['b']);
    handleMarkVacancyVisit(preferences.candidate_id, { visitsStore, now: () => new Date('2026-10-17T10:00:00.000Z') });
    const second = await handleListSearches(preferences.candidate_id, {
      agent,
      searchesStore,
      visitsStore,
      now: () => new Date('2026-10-17T10:01:00.000Z'),
    });
    expect((second.body as { searches: Array<{ newSinceLastVisit: unknown[] }> }).searches[0]!.newSinceLastVisit).toHaveLength(0);
  });
});
