import { NextResponse } from 'next/server';
import { handleSimulatedInterview } from '../../../lib/interview-handler';
import { readJsonBody } from '../../../lib/request-body';
import { candidateIdFromRequestOrSession, unauthorized } from '../../../lib/candidate-session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  const candidateId = await candidateIdFromRequestOrSession(request);
  if (!candidateId) return unauthorized();
  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;
  const { status, body } = handleSimulatedInterview(candidateId, parsed.payload);
  return NextResponse.json(body, { status });
}
