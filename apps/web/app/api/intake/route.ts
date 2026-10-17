import { NextResponse } from 'next/server';
import { createAgentFromEnv } from '@puente/agent-runtime';
import { handleIntake } from '../../../lib/intake-handler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
  return NextResponse.json(body, { status });
}
