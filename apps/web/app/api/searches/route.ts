import { NextResponse } from 'next/server';
import { handleListSearches, handleSaveSearch } from '../../../lib/searches-handler';
import { readJsonBody } from '../../../lib/request-body';
import { persistCandidatePreferences } from '../../../lib/neon-repository';
import { preferencesStore } from '../../../lib/preferences-store';
import { savedSearchesStore } from '../../../lib/saved-searches-store';
import { candidateIdFromRequest, unauthorized } from '../../../lib/candidate-session';
import { persistSavedSearch, readSavedSearches } from '../../../lib/neon-repository';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  const candidateId = candidateIdFromRequest(request);
  if (!candidateId) return unauthorized();
  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;

  const input = parsed.payload as Record<string, unknown>;
  const preferences = { ...((input.preferences as Record<string, unknown> | undefined) ?? {}), candidate_id: candidateId };
  const { status, body } = await handleSaveSearch({ ...input, preferences });
  if (status === 201 && typeof body === 'object' && body && 'preferences' in body) {
    const preferences = body.preferences as import('@puente/domain').CandidatePreferences;
    const previousPreferences = preferencesStore.get(preferences.candidate_id);
    const previousSearches = savedSearchesStore.list(preferences.candidate_id);
      try {
        await persistCandidatePreferences(preferences);
        await persistSavedSearch(body as import('../../../lib/saved-searches-store').SavedSearch);
    } catch {
      savedSearchesStore.deleteByCandidate(preferences.candidate_id);
      for (const search of previousSearches) savedSearchesStore.save(search);
      if (previousPreferences) preferencesStore.save(previousPreferences);
      else preferencesStore.delete(preferences.candidate_id);
      return NextResponse.json({ error: 'persistence_unavailable' }, { status: 503 });
    }
  }
  return NextResponse.json(body, { status });
}

export async function GET(request: Request): Promise<Response> {
  const candidateId = candidateIdFromRequest(request);
  if (!candidateId) return unauthorized();
  try {
    for (const search of await readSavedSearches(candidateId)) savedSearchesStore.save(search);
  } catch {
    return NextResponse.json({ error: 'persistence_unavailable' }, { status: 503 });
  }
  const { status, body } = await handleListSearches(candidateId);
  return NextResponse.json(body, { status });
}
