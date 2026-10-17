import { NextResponse } from 'next/server';
import { checkNeonDatabase } from '../../../../lib/neon-db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function describeDatabaseError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === 'object') {
    const details = error as { code?: string; syscall?: string; address?: string; port?: number };
    const parts = [details.code, details.syscall, details.address, details.port].filter(Boolean);
    if (parts.length > 0) return parts.join(' ');
  }
  return 'database_connection_failed';
}

export async function GET(): Promise<Response> {
  try {
    return NextResponse.json(await checkNeonDatabase());
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: describeDatabaseError(error) },
      { status: 503 },
    );
  }
}
