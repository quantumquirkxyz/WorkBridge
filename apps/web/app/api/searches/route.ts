import { NextResponse } from 'next/server';
import { handleListSearches, handleSaveSearch } from '../../../lib/searches-handler';
import { readJsonBody } from '../../../lib/request-body';
import { persistCandidatePreferences } from '../../../lib/neon-repository';
import { preferencesStore } from '../../../lib/preferences-store';
import { savedSearchesStore } from '../../../lib/saved-searches-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;

  const { status, body } = await handleSaveSearch(parsed.payload);
  if (status === 201 && typeof body === 'object' && body && 'preferences' in body) {
    const preferences = body.preferences as import('@puente/domain').CandidatePreferences;
    const previousPreferences = preferencesStore.get(preferences.candidate_id);
    const previousSearches = savedSearchesStore.list(preferences.candidate_id);
    try {
      await persistCandidatePreferences(preferences);
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
  const candidateId = new URL(request.url).searchParams.get('candidateId') ?? '';
  const { status, body } = await handleListSearches(candidateId);
  return NextResponse.json(body, { status });
}
