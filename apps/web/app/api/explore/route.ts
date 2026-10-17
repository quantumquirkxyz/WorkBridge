import { NextResponse } from 'next/server';
import { handleExploration } from '../../../lib/exploration-handler';
import { readJsonBody } from '../../../lib/request-body';
import { persistCandidatePreferences } from '../../../lib/neon-repository';
import { preferencesStore } from '../../../lib/preferences-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;

  const { status, body } = await handleExploration(parsed.payload);
  if (status === 200 && typeof body === 'object' && body && 'preferences' in body) {
    const preferences = body.preferences as import('@puente/domain').CandidatePreferences;
    const previous = preferencesStore.get(preferences.candidate_id);
    try {
      await persistCandidatePreferences(preferences);
    } catch {
      if (previous) preferencesStore.save(previous);
      else preferencesStore.delete(preferences.candidate_id);
      return NextResponse.json({ error: 'persistence_unavailable' }, { status: 503 });
    }
  }
  return NextResponse.json(body, { status });
}
