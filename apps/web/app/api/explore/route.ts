import { NextResponse } from 'next/server';
import { handleExploration } from '../../../lib/exploration-handler';
import { readJsonBody } from '../../../lib/request-body';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;

  const { status, body } = await handleExploration(parsed.payload);
  return NextResponse.json(body, { status });
}
