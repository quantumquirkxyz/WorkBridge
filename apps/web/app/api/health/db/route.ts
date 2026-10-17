import { NextResponse } from 'next/server';
import { checkNeonDatabase } from '../../../../lib/neon-db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  try {
    return NextResponse.json(await checkNeonDatabase());
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'database_unavailable' },
      { status: 503 },
    );
  }
}
