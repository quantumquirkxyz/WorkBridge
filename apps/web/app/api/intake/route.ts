import { NextResponse } from 'next/server';
import { createAgentFromEnv } from '@workbridge/agent-runtime';
import { makeCandidateId, type CandidateProfile } from '@workbridge/domain';
import { handleIntake } from '../../../lib/intake-handler';
import { persistCandidateProfile, readCandidateProfile } from '../../../lib/neon-repository';
import { profileStore } from '../../../lib/profile-store';
import { MAX_CANDIDATE_ID_LENGTH } from '../../../lib/exploration-handler';
import { candidateIdFromRequestOrSession, candidateUserIdFromRequestOrSession, unauthorized } from '../../../lib/candidate-session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  const candidateId = await candidateIdFromRequestOrSession(request);
  if (!candidateId) return unauthorized();
  if (candidateId.length > MAX_CANDIDATE_ID_LENGTH) return NextResponse.json({ error: 'invalid_candidate_id' }, { status: 400 });
  try {
    const profile = await readCandidateProfile(candidateId);
    return profile ? NextResponse.json(profile) : NextResponse.json({ error: 'not_found' }, { status: 404 });
  } catch {
    return NextResponse.json({ error: 'persistence_unavailable' }, { status: 503 });
  }
}

export async function POST(request: Request): Promise<Response> {
  const userId = await candidateUserIdFromRequestOrSession(request);
  if (!userId) return unauthorized();
  const candidateId = makeCandidateId(userId);
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  // The raw user id is the seed. normalizeProfileDraft hashes it once, so the stored
  // candidate_id matches the id used to read the profile and to authorize a draft.
  payload = { ...(payload as Record<string, unknown>), candidateId: userId };
  const candidateKey = candidateId;
  if (candidateKey && !profileStore.get(candidateKey)) {
    try {
      const durable = await readCandidateProfile(candidateKey);
      if (durable) profileStore.save(durable);
    } catch {
      return NextResponse.json({ error: 'persistence_unavailable' }, { status: 503 });
    }
  }
  const previous = candidateKey ? profileStore.get(candidateKey) : undefined;

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
    const profile = body.profile as CandidateProfile;
    const rollback = candidateKey ? previous : profileStore.get(profile.candidate_id);
    const rollbackKey = candidateKey ?? profile.candidate_id;
    try {
      await persistCandidateProfile(profile);
    } catch {
      if (rollback) profileStore.save(rollback);
      else profileStore.delete(rollbackKey);
      return NextResponse.json({ error: 'persistence_unavailable' }, { status: 503 });
    }
  }
  return NextResponse.json(body, { status });
}
