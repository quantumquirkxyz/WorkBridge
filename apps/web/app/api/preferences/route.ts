import { NextResponse } from 'next/server';
import { handleDeleteCandidate, handleSavePreferences, MAX_CANDIDATE_ID_LENGTH } from '../../../lib/exploration-handler';
import { readJsonBody } from '../../../lib/request-body';
import { persistCandidatePreferences, deleteCandidateData, readCandidatePreferences, readCandidateProfile } from '../../../lib/neon-repository';
import { preferencesStore } from '../../../lib/preferences-store';
import { profileStore } from '../../../lib/profile-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  const candidateId = new URL(request.url).searchParams.get('candidateId');
  if (!candidateId) return NextResponse.json({ error: 'missing_candidate_id' }, { status: 400 });
  if (candidateId.length > MAX_CANDIDATE_ID_LENGTH) return NextResponse.json({ error: 'invalid_candidate_id' }, { status: 400 });
  try {
    const preferences = await readCandidatePreferences(candidateId);
    return preferences ? NextResponse.json(preferences) : NextResponse.json({ error: 'not_found' }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: 'persistence_unavailable' }, { status: 503 });
  }
}

export async function POST(request: Request): Promise<Response> {
  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;

  const { status, body } = handleSavePreferences(parsed.payload);
  if (status === 200) {
    const candidateId = (body as import('@puente/domain').CandidatePreferences).candidate_id;
    const previous = preferencesStore.get(candidateId);
    try {
      await persistCandidatePreferences(body as import('@puente/domain').CandidatePreferences);
    } catch (error) {
      if (previous) preferencesStore.save(previous);
      else preferencesStore.delete(candidateId);
      return NextResponse.json({ error: 'persistence_unavailable' }, { status: 503 });
    }
  }
  return NextResponse.json(body, { status });
}

export async function DELETE(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;
  // Distinguish a missing parameter from an empty one (T-D).
  if (!params.has('candidateId')) {
    return NextResponse.json({ error: 'missing_candidate_id' }, { status: 400 });
  }
  const candidateId = params.get('candidateId') ?? '';
  if (!candidateId || candidateId.length > MAX_CANDIDATE_ID_LENGTH) {
    return NextResponse.json({ error: 'invalid_candidate_id' }, { status: 400 });
  }
  let durableExists = false;
  try {
    durableExists = Boolean(await readCandidatePreferences(candidateId) ?? await readCandidateProfile(candidateId));
  } catch (error) {
    return NextResponse.json({ error: 'persistence_unavailable' }, { status: 503 });
  }
  if (durableExists) {
    try {
      await deleteCandidateData(candidateId);
    } catch (error) {
      return NextResponse.json({ error: 'persistence_unavailable', message: error instanceof Error ? error.message : String(error) }, { status: 503 });
    }
  }
  const { status, body } = handleDeleteCandidate(candidateId);
  if (durableExists) profileStore.delete(candidateId);
  if (durableExists && status === 404) return NextResponse.json({ deleted: true, candidateId, preferencesDeleted: true, searchesDeleted: 0 }, { status: 200 });
  return NextResponse.json(body, { status });
}
