import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createSqlChatJobStore, type SqlQuery } from '../lib/chat-jobs';

// Opt in explicitly so a locally exported DATABASE_URL cannot make the normal
// unit suite mutate a developer database or fail when the database is offline.
const databaseUrl = process.env.RUN_CHAT_JOBS_DB_INTEGRATION === '1' ? process.env.DATABASE_URL : undefined;
const describeDatabase = databaseUrl ? describe : describe.skip;
const candidatePrefix = `chat_job_integration_${Date.now()}_`;
let pool: Pool;
let store: ReturnType<typeof createSqlChatJobStore>;

const input = (candidateId: string, idempotencyKey: string) => ({
  candidateId,
  idempotencyKey,
  sessionVersion: 0,
  payload: { message: 'hola', action: { kind: 'text' } },
  traceId: `trace-${candidateId}`,
  requestId: `request-${candidateId}`,
});

describeDatabase('chat_jobs PostgreSQL integration', () => {
  beforeAll(async () => {
    pool = new Pool({ connectionString: databaseUrl, max: 4 });
    const migration = await readFile(fileURLToPath(new URL('../../../migrations/004_chat_jobs.sql', import.meta.url)), 'utf8');
    await pool.query(migration);
    const query: SqlQuery = async (sql, params) => {
      const result = await pool.query(sql, [...params]);
      return { rows: result.rows as Array<Record<string, unknown>> };
    };
    store = createSqlChatJobStore(query);
  });

  afterAll(async () => {
    if (!pool) return;
    await pool.query('delete from chat_jobs where candidate_id like $1', [`${candidatePrefix}%`]);
    await pool.end();
  });

  it('inserts, reuses duplicate keys, claims, and acknowledges a job', async () => {
    const candidateId = `${candidatePrefix}single`;
    const first = await store.enqueue(input(candidateId, 'same-key'));
    const duplicate = await store.enqueue({ ...input(candidateId, 'same-key'), requestId: 'retry-request' });

    expect(first.created).toBe(true);
    expect(duplicate.created).toBe(false);
    expect(duplicate.job.jobId).toBe(first.job.jobId);

    const claimed = await store.claimNext({ leaseOwner: 'integration-worker', leaseMs: 30_000 });
    expect(claimed?.jobId).toBe(first.job.jobId);
    expect(claimed?.status).toBe('running');
    expect(claimed?.leaseOwner).toBe('integration-worker');
    expect(claimed?.attempts).toBe(1);

    await store.succeed(first.job.jobId, { reply: 'completado' });
    const completed = await store.get(first.job.jobId);
    expect(completed?.status).toBe('succeeded');
    expect(completed?.result).toEqual({ reply: 'completado' });
  });

  it('uses SKIP LOCKED to claim different rows concurrently', async () => {
    const first = await store.enqueue(input(`${candidatePrefix}a`, 'key-a'));
    const second = await store.enqueue(input(`${candidatePrefix}b`, 'key-b'));

    const claimed = await Promise.all([
      store.claimNext({ leaseOwner: 'integration-worker-a', leaseMs: 30_000 }),
      store.claimNext({ leaseOwner: 'integration-worker-b', leaseMs: 30_000 }),
    ]);
    const claimedIds = claimed.map((job) => job?.jobId).filter((jobId): jobId is string => Boolean(jobId));

    expect(claimedIds).toHaveLength(2);
    expect(new Set(claimedIds)).toEqual(new Set([first.job.jobId, second.job.jobId]));
  });
});
