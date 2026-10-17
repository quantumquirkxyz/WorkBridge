import { NextResponse } from 'next/server';
import { handleListSearches, handleSaveSearch } from '../../../lib/searches-handler';
import { readJsonBody } from '../../../lib/request-body';
import { persistCandidatePreferences } from '../../../lib/neon-repository';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;

  const { status, body } = await handleSaveSearch(parsed.payload);
  if (status === 201 && typeof body === 'object' && body && 'preferences' in body) {
    try {
      await persistCandidatePreferences(body.preferences as import('@puente/domain').CandidatePreferences);
    } catch (error) {
      return NextResponse.json({ error: 'persistence_unavailable', message: error instanceof Error ? error.message : String(error) }, { status: 503 });
    }
  }
  return NextResponse.json(body, { status });
}

export async function GET(request: Request): Promise<Response> {
  const candidateId = new URL(request.url).searchParams.get('candidateId') ?? '';
  const { status, body } = await handleListSearches(candidateId);
  return NextResponse.json(body, { status });
}
