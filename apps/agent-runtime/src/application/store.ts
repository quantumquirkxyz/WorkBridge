export interface IdempotencyRecord<T> {
  key: string;
  fingerprint: string;
  response: T;
}

export interface IdempotencyStore<T> {
  get(key: string): Promise<IdempotencyRecord<T> | undefined>;
  put(record: IdempotencyRecord<T>): Promise<void>;
}

export interface SqlQuery {
  (sql: string, params: readonly unknown[]): Promise<{ rows: Array<Record<string, unknown>> }>;
}

export const ENSURE_IDEMPOTENCY_TABLE_SQL = `CREATE TABLE IF NOT EXISTS submission_idempotency (
  idempotency_key text PRIMARY KEY,
  fingerprint text NOT NULL,
  response jsonb NOT NULL
)`;

export function createMemoryIdempotencyStore<T>(): IdempotencyStore<T> {
  const rows = new Map<string, IdempotencyRecord<T>>();
  return {
    async get(key) {
      return rows.get(key);
    },
    async put(record) {
      rows.set(record.key, record);
    },
  };
}

export function createSqlIdempotencyStore<T>(query: SqlQuery): IdempotencyStore<T> {
  let ready: Promise<void> | undefined;
  const ensure = () => {
    ready ??= query(ENSURE_IDEMPOTENCY_TABLE_SQL, []).then(() => undefined);
    return ready;
  };
  return {
    async get(key) {
      await ensure();
      const result = await query(
        "SELECT fingerprint, response FROM submission_idempotency WHERE idempotency_key = $1",
        [key],
      );
      const row = result.rows[0];
      if (!row || typeof row.fingerprint !== "string") return undefined;
      const response = typeof row.response === "string" ? (JSON.parse(row.response) as T) : (row.response as T);
      return { key, fingerprint: row.fingerprint, response };
    },
    async put(record) {
      await ensure();
      await query(
        `INSERT INTO submission_idempotency (idempotency_key, fingerprint, response)
         VALUES ($1, $2, $3::jsonb)
         ON CONFLICT (idempotency_key) DO NOTHING`,
        [record.key, record.fingerprint, JSON.stringify(record.response)],
      );
    },
  };
}
