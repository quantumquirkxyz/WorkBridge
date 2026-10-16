export type DatabaseMode = "memory" | "primary" | "neon-backup";

/**
 * Primary Postgres is `DATABASE_URL`. When it is absent, `NEON_DATABASE_URL`
 * is the backup target. Neither value is returned, so a health check cannot
 * leak a connection string.
 */
export function resolveDatabaseMode(env: {
  DATABASE_URL?: string;
  NEON_DATABASE_URL?: string;
}): DatabaseMode {
  if (typeof env.DATABASE_URL === "string" && env.DATABASE_URL.length > 0) return "primary";
  if (typeof env.NEON_DATABASE_URL === "string" && env.NEON_DATABASE_URL.length > 0) {
    return "neon-backup";
  }
  return "memory";
}

export function createPgQuery(connectionString: string): import("./store").SqlQuery {
  let pool:
    | { query: (sql: string, params: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }> }
    | undefined;
  return async (sql, params) => {
    if (!pool) {
      const { Pool } = await import("pg");
      pool = new Pool({ connectionString, max: 2 });
    }
    const result = await pool.query(sql, [...params]);
    return { rows: result.rows };
  };
}
