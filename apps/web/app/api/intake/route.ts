import { NextResponse } from 'next/server';
import { createAgentFromEnv } from '@puente/agent-runtime';
import { handleIntake } from '../../../lib/intake-handler';
import { persistCandidateProfile, readCandidateProfile } from '../../../lib/neon-repository';
import { profileStore } from '../../../lib/profile-store';
import { MAX_CANDIDATE_ID_LENGTH } from '../../../lib/exploration-handler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  const candidateId = new URL(request.url).searchParams.get('candidateId');
  if (!candidateId) return NextResponse.json({ error: 'missing_candidate_id' }, { status: 400 });
  if (candidateId.length > MAX_CANDIDATE_ID_LENGTH) return NextResponse.json({ error: 'invalid_candidate_id' }, { status: 400 });
  try {
    const profile = await readCandidateProfile(candidateId);
    return profile ? NextResponse.json(profile) : NextResponse.json({ error: 'not_found' }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: 'persistence_unavailable', message: error instanceof Error ? error.message : String(error) }, { status: 503 });
  }
}

export async function POST(request: Request): Promise<Response> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  // With no OPENROUTER_API_KEY this resolves to the deterministic heuristic
  // extractor; the profile is still schema-valid either way.
  const { agent } = createAgentFromEnv({
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    OPENROUTER_MODEL: process.env.OPENROUTER_MODEL,
    OPENROUTER_VISION_MODEL: process.env.OPENROUTER_VISION_MODEL,
    OPENROUTER_BASE_URL: process.env.OPENROUTER_BASE_URL,
  });
  const { status, body } = await handleIntake(payload, { agent });
  if (status === 200 && typeof body === 'object' && body && 'profile' in body) {
    const profile = body.profile as import('@puente/domain').CandidateProfile;
    const previous = profileStore.get(profile.candidate_id);
    try {
      await persistCandidateProfile(profile);
    } catch (error) {
      if (previous) profileStore.save(previous);
      else profileStore.delete(profile.candidate_id);
      return NextResponse.json({ error: 'persistence_unavailable' }, { status: 503 });
    }
  }
  return NextResponse.json(body, { status });
}
