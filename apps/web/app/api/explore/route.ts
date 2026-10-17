import { NextResponse } from 'next/server';
import { handleExploration } from '../../../lib/exploration-handler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const { status, body } = await handleExploration(payload);
  return NextResponse.json(body, { status });
}
