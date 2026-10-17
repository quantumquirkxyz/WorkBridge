import { NextResponse } from 'next/server';
import { candidateIdFromRequestOrSession, unauthorized } from '../../../lib/candidate-session';
import { readCandidateProfile } from '../../../lib/neon-repository';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  const candidateId = await candidateIdFromRequestOrSession(request);
  if (!candidateId) return unauthorized();
  try {
    const profile = await readCandidateProfile(candidateId);
    return profile ? NextResponse.json(profile) : NextResponse.json({ error: 'not_found' }, { status: 404 });
  } catch {
    return NextResponse.json({ error: 'persistence_unavailable' }, { status: 503 });
  }
}
