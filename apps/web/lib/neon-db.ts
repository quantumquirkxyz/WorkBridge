import { Pool } from 'pg';

let pool: Pool | undefined;

export function getNeonPool(): Pool {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured');
  pool ??= new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
  return pool;
}

export async function checkNeonDatabase(): Promise<{ ok: true; database: string }> {
  const result = await getNeonPool().query<{ database: string }>('select current_database() as database');
  return { ok: true, database: result.rows[0]?.database ?? 'unknown' };
}
