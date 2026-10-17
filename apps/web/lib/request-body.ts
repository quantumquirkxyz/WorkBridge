import { NextResponse } from 'next/server';

type JsonBody = { ok: true; payload: unknown } | { ok: false; response: Response };

/**
 * Read and parse a JSON request body, or return the shared 400 response. Both
 * API routes use this so the malformed-body behaviour stays identical.
 */
export async function readJsonBody(request: Request): Promise<JsonBody> {
  try {
    return { ok: true, payload: await request.json() };
  } catch {
    return { ok: false, response: NextResponse.json({ error: 'invalid_json' }, { status: 400 }) };
  }
}
