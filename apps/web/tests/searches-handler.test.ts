import { describe, expect, it, vi } from 'vitest';
import type { CandidatePreferences, ExplorationResult } from '@puente/catalog';
import { createInMemoryPreferencesStore } from '../lib/preferences-store';
import { createInMemorySavedSearchesStore } from '../lib/saved-searches-store';
import { handleListSearches, handleSaveSearch } from '../lib/searches-handler';
import { type PreferencesDraft } from '../lib/preferences';
import preferencesFixture from '../../../packages/catalog/fixtures/preferences.json';

const NOW = () => new Date('2026-10-16T12:00:00.000Z');
const preferences = preferencesFixture as CandidatePreferences;

function draft(): PreferencesDraft {
  const { schema_version: _v, preferences_id: _p, origin: _o, created_at: _c, updated_at: _u, ...rest } = preferences;
  return rest;
}

/** Minimal ExplorationResult carrying only the fields the searches handler reads. */
function resultWith(jobIds: string[]): ExplorationResult {
  return {
    schemaVersion: '1.0.0',
    candidateId: preferences.candidate_id,
    generatedAt: '2026-10-16T12:00:00.000Z',
    preferences,
    matches: jobIds.map((jobId) => ({ vacancy: { jobId } })),
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
});
