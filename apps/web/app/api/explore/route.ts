import { NextResponse } from 'next/server';
import { handleExploration } from '../../../lib/exploration-handler';
import { readJsonBody } from '../../../lib/request-body';
import { persistCandidatePreferences } from '../../../lib/neon-repository';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;

  const { status, body } = await handleExploration(parsed.payload);
  if (status === 200 && typeof body === 'object' && body && 'preferences' in body) {
    try {
      await persistCandidatePreferences(body.preferences as import('@puente/domain').CandidatePreferences);
    } catch (error) {
      return NextResponse.json({ error: 'persistence_unavailable', message: error instanceof Error ? error.message : String(error) }, { status: 503 });
    }
  }
  return NextResponse.json(body, { status });
}
