import { NextResponse } from 'next/server';
import { candidateIdFromRequest, unauthorized } from '../../../lib/candidate-session';
import { readJsonBody } from '../../../lib/request-body';
import { readCandidatePreferences, readCandidateProfile } from '../../../lib/neon-repository';
import { handleMatch } from '../../../lib/match-handler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  const candidateId = candidateIdFromRequest(request);
  if (!candidateId) return unauthorized();
  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;
  const [preferences, profile] = await Promise.all([readCandidatePreferences(candidateId), readCandidateProfile(candidateId)]);
  const result = await handleMatch(parsed.payload, { preferences, profile });
  return NextResponse.json(result.body, { status: result.status });
}
