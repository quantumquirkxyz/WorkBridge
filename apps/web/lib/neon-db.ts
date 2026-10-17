import { neon } from '@neondatabase/serverless';

export function getNeonSql(): ReturnType<typeof neon> {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured');
  return neon(process.env.DATABASE_URL);
}

export async function checkNeonDatabase(): Promise<{ ok: true; database: string }> {
  const result = await getNeonSql()`select current_database() as database` as Array<{ database: string }>;
  return { ok: true, database: result[0]?.database ?? 'unknown' };
}
