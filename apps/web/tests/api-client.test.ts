import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  checkDbHealth,
  deleteCandidatePreferences,
  exploreVacancies,
  getCandidateProfile,
  getPreferences,
  listSavedSearches,
  postIntake,
  postPreferences,
  requestRoadmap,
  saveSearch,
} from '../lib/api/client';
import { ApiClientError } from '../lib/api/errors';
import { intakeProfileQueryKey } from '../lib/queries/intake';
import { preferencesQueryKey } from '../lib/queries/preferences';
import { searchesQueryKey } from '../lib/queries/searches';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('typed API client', () => {
  it('reads successful JSON payloads from each resource', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/api/intake') && init?.method === 'POST') {
        return jsonResponse(200, { profile: { candidate_id: 'c1' } });
      }
      if (url.includes('/api/intake')) return jsonResponse(200, { candidate_id: 'c1' });
      if (url.includes('/api/preferences') && init?.method === 'POST') {
        return jsonResponse(200, { candidateId: 'c1' });
      }
      if (url.includes('/api/candidate') && init?.method === 'DELETE') {
        return jsonResponse(200, { deleted: true, candidateId: 'c1' });
      }
      if (url.includes('/api/preferences')) return jsonResponse(200, { candidateId: 'c1' });
      if (url.includes('/api/explore')) return jsonResponse(200, { matches: [] });
      if (url.includes('/api/roadmap')) return jsonResponse(200, { roadmap: null, gaps: [], reason: 'none' });
      if (url.includes('/api/searches') && init?.method === 'POST') {
        return jsonResponse(200, { searchId: 's1' });
      }
      if (url.includes('/api/searches')) return jsonResponse(200, { searches: [{ search: { searchId: 's1' } }] });
      if (url.includes('/api/health/db')) return jsonResponse(200, { ok: true, database: 'workbridge' });
      return jsonResponse(404, { error: 'not_found' });
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(getCandidateProfile('c1')).resolves.toEqual({ candidate_id: 'c1' });
    await expect(postIntake({ kind: 'text', text: 'cv' } as never)).resolves.toEqual({
      profile: { candidate_id: 'c1' },
    });
    await expect(getPreferences('c1')).resolves.toEqual({ candidateId: 'c1' });
    await expect(postPreferences({ candidateId: 'c1' } as never)).resolves.toEqual({ candidateId: 'c1' });
    await expect(deleteCandidatePreferences('c1')).resolves.toEqual({ deleted: true, candidateId: 'c1' });
    await expect(exploreVacancies({} as never)).resolves.toEqual({ matches: [] });
    await expect(requestRoadmap({} as never)).resolves.toEqual({ roadmap: null, gaps: [], reason: 'none' });
    await expect(listSavedSearches('c1')).resolves.toEqual([{ search: { searchId: 's1' } }]);
    await expect(saveSearch({ label: 'Hoy', preferences: {} as never })).resolves.toEqual({ searchId: 's1' });
    await expect(checkDbHealth()).resolves.toEqual({ ok: true, database: 'workbridge' });
  });

  it('throws ApiClientError when a resource returns an error body', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(422, { error: 'intake_failed', message: 'down' })));
    await expect(getCandidateProfile('c1')).rejects.toBeInstanceOf(ApiClientError);
  });

  it('still routes a failed health response through readJson', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(503, { ok: false, error: 'offline' })));
    await expect(checkDbHealth()).rejects.toBeInstanceOf(ApiClientError);
  });
});

describe('query keys', () => {
  it('scopes cache keys by candidate', () => {
    expect(intakeProfileQueryKey('c1')).toEqual(['intake', 'profile', 'c1']);
    expect(preferencesQueryKey('c1')).toEqual(['preferences', 'c1']);
    expect(searchesQueryKey('c1')).toEqual(['searches', 'c1']);
  });
});
