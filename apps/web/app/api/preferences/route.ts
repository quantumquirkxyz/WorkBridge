import { NextResponse } from 'next/server';
import { handleSavePreferences } from '../../../lib/exploration-handler';
import { readJsonBody } from '../../../lib/request-body';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;

  const { status, body } = handleSavePreferences(parsed.payload);
  return NextResponse.json(body, { status });
}
