import { describe, expect, it } from 'vitest';
import {
  createInMemoryChatJobStore,
  createNeonChatJobQuery,
  createSqlChatJobStore,
  getChatJobStore,
  resetChatJobStore,
  type SqlQuery,
} from '../lib/chat-jobs';

const base = {
  candidateId: 'candidate_a',
  idempotencyKey: 'key-1',
  sessionVersion: 0,
  payload: { message: 'hola', action: { kind: 'text' } },
  traceId: 'trace-1',
  requestId: 'req-1',
};

function sqlRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    job_id: 'chatjob_1',
    candidate_id: 'candidate_a',
    idempotency_key: 'key-1',
    session_version: 0,
    payload: { message: 'hola', action: { kind: 'text' } },
    status: 'queued',
    attempts: 0,
    max_attempts: 3,
    lease_owner: null,
    lease_expires_at: null,
    trace_id: 'trace-1',
    request_id: 'req-1',
    result: null,
    error_code: null,
    error_message: null,
    error_retryable: null,
    created_at: '2026-10-17T00:00:00.000Z',
    updated_at: '2026-10-17T00:00:00.000Z',
    started_at: null,
    finished_at: null,
    ...overrides,
  };
}

function scriptedQuery(resolve: (sql: string, params: readonly unknown[]) => Array<Record<string, unknown>>) {
  const calls: Array<{ sql: string; params: readonly unknown[] }> = [];
  const query: SqlQuery = async (sql, params) => {
    calls.push({ sql, params });
    return { rows: resolve(sql, params) };
  };
  return { query, calls };
}

describe('in-memory chat job queue', () => {
  it('inserts a queued job owned by the candidate', async () => {
    const store = createInMemoryChatJobStore();
    const { job, created } = await store.enqueue(base);

    expect(created).toBe(true);
    expect(job.jobId).toMatch(/^chatjob_/);
    expect(job.status).toBe('queued');
    expect(job.candidateId).toBe('candidate_a');
    expect(job.idempotencyKey).toBe('key-1');
    expect(job.sessionVersion).toBe(0);
    expect(job.payload).toEqual(base.payload);
    expect(job.attempts).toBe(0);
    expect(job.maxAttempts).toBe(3);
    expect(job.traceId).toBe('trace-1');
    expect(job.requestId).toBe('req-1');
  });

  it('returns the existing job for a duplicate idempotency key without a second row', async () => {
    const store = createInMemoryChatJobStore();
    const first = await store.enqueue(base);
    const second = await store.enqueue({ ...base, requestId: 'req-2' });

    expect(second.created).toBe(false);
    expect(second.job.jobId).toBe(first.job.jobId);
    expect(second.job.requestId).toBe('req-1');

    const other = await store.enqueue({ ...base, candidateId: 'candidate_b', requestId: 'req-3' });
    expect(other.created).toBe(true);
    expect(other.job.jobId).not.toBe(first.job.jobId);
  });

  it('claims the oldest queued job with a lease and increments attempts', async () => {
    const store = createInMemoryChatJobStore();
    const first = await store.enqueue(base);
    await store.enqueue({ ...base, idempotencyKey: 'key-2', requestId: 'req-2' });

    const claimed = await store.claimNext({ leaseOwner: 'w1', leaseMs: 1000, now: 1000 });
    expect(claimed?.jobId).toBe(first.job.jobId);
    expect(claimed?.status).toBe('running');
    expect(claimed?.attempts).toBe(1);
    expect(claimed?.leaseOwner).toBe('w1');
    expect(claimed?.leaseExpiresAt).toBe(new Date(2000).toISOString());
  });

  it('keeps a valid lease and reclaims an expired one', async () => {
    const store = createInMemoryChatJobStore();
    const { job } = await store.enqueue(base);
    await store.claimNext({ leaseOwner: 'w1', leaseMs: 1000, now: 1000 });

    expect(await store.claimNext({ leaseOwner: 'w2', leaseMs: 1000, now: 1500 })).toBeUndefined();

    const reclaimed = await store.claimNext({ leaseOwner: 'w2', leaseMs: 1000, now: 3000 });
    expect(reclaimed?.jobId).toBe(job.jobId);
    expect(reclaimed?.attempts).toBe(2);
    expect(reclaimed?.leaseOwner).toBe('w2');
  });

  it('marks a job succeeded with its result and clears any error', async () => {
    const store = createInMemoryChatJobStore();
    const { job } = await store.enqueue(base);
    await store.claimNext({ leaseOwner: 'w1', leaseMs: 1000 });
    await store.succeed(job.jobId, { reply: 'ok' });

    const stored = await store.get(job.jobId);
    expect(stored?.status).toBe('succeeded');
    expect(stored?.result).toEqual({ reply: 'ok' });
    expect(stored?.error).toBeUndefined();
    expect(stored?.leaseOwner).toBeUndefined();
  });

  it('marks a job failed with a terminal error and clears any result', async () => {
    const store = createInMemoryChatJobStore();
    const { job } = await store.enqueue(base);
    await store.claimNext({ leaseOwner: 'w1', leaseMs: 1000 });
    await store.fail(job.jobId, { code: 'invalid_chat_request', message: 'bad', retryable: false });

    const stored = await store.get(job.jobId);
    expect(stored?.status).toBe('failed');
    expect(stored?.error).toEqual({ code: 'invalid_chat_request', message: 'bad', retryable: false });
    expect(stored?.result).toBeUndefined();
  });

  it('releases a claimed job back to queued', async () => {
    const store = createInMemoryChatJobStore();
    const { job } = await store.enqueue(base);
    await store.claimNext({ leaseOwner: 'w1', leaseMs: 1000 });
    await store.release(job.jobId);

    const stored = await store.get(job.jobId);
    expect(stored?.status).toBe('queued');
    expect(stored?.leaseOwner).toBeUndefined();
  });

  it('finds by idempotency key and deletes by candidate', async () => {
    const store = createInMemoryChatJobStore();
    const { job } = await store.enqueue(base);

    expect((await store.findByIdempotencyKey('candidate_a', 'key-1'))?.jobId).toBe(job.jobId);
    expect(await store.findByIdempotencyKey('candidate_b', 'key-1')).toBeUndefined();

    await store.deleteByCandidate('candidate_a');
    expect(await store.get(job.jobId)).toBeUndefined();
    expect(await store.findByIdempotencyKey('candidate_a', 'key-1')).toBeUndefined();
  });
});

describe('sql chat job queue', () => {
  it('inserts a job with an idempotent unique conflict', async () => {
    const { query, calls } = scriptedQuery((sql) => (/insert into chat_jobs/.test(sql) ? [sqlRow()] : []));
    const store = createSqlChatJobStore(query);

    const { job, created } = await store.enqueue(base);
    expect(created).toBe(true);
    expect(job.jobId).toBe('chatjob_1');
    expect(calls[0]?.sql).toContain('on conflict (candidate_id, idempotency_key) do nothing');
  });

  it('returns the existing row when the insert conflicts', async () => {
    const { query } = scriptedQuery((sql) =>
      /insert into chat_jobs/.test(sql) ? [] : [sqlRow({ status: 'succeeded', result: { reply: 'ok' } })],
    );
    const store = createSqlChatJobStore(query);

    const { job, created } = await store.enqueue(base);
    expect(created).toBe(false);
    expect(job.status).toBe('succeeded');
    expect(job.result).toEqual({ reply: 'ok' });
  });

  it('claims with skip locked and maps the running row', async () => {
    const { query, calls } = scriptedQuery((sql) =>
      /for update skip locked/.test(sql)
        ? [sqlRow({ status: 'running', attempts: 1, lease_owner: 'w1', lease_expires_at: '2026-10-17T00:00:30.000Z', started_at: '2026-10-17T00:00:00.000Z' })]
        : [],
    );
    const store = createSqlChatJobStore(query);

    const claimed = await store.claimNext({ leaseOwner: 'w1', leaseMs: 30_000 });
    expect(claimed?.status).toBe('running');
    expect(claimed?.attempts).toBe(1);
    expect(claimed?.leaseOwner).toBe('w1');
    expect(claimed?.startedAt).toBe('2026-10-17T00:00:00.000Z');
    expect(calls[0]?.sql).toContain('skip locked');
    expect(calls[0]?.params).toEqual(['w1', '30000']);
  });

  it('returns undefined when no job is claimable', async () => {
    const { query } = scriptedQuery(() => []);
    const store = createSqlChatJobStore(query);
    expect(await store.claimNext({ leaseOwner: 'w1', leaseMs: 1000 })).toBeUndefined();
  });

  it('reads, succeeds, fails, releases, and deletes through SQL', async () => {
    const { query, calls } = scriptedQuery((sql) => {
      if (/select \* from chat_jobs where job_id/.test(sql)) return [sqlRow({ error_code: 'chat_execution_failed', error_message: 'nope', error_retryable: true })];
      if (/select \* from chat_jobs where candidate_id/.test(sql)) return [sqlRow()];
      return [];
    });
    const store = createSqlChatJobStore(query);

    const found = await store.findByIdempotencyKey('candidate_a', 'key-1');
    expect(found?.jobId).toBe('chatjob_1');

    const got = await store.get('chatjob_1');
    expect(got?.error).toEqual({ code: 'chat_execution_failed', message: 'nope', retryable: true });

    await store.succeed('chatjob_1', { reply: 'ok' });
    await store.fail('chatjob_1', { code: 'chat_execution_failed', message: 'nope', retryable: true });
    await store.release('chatjob_1');
    await store.deleteByCandidate('candidate_a');

    const statements = calls.map((call) => call.sql).join('\n');
    expect(statements).toContain("set status = 'succeeded'");
    expect(statements).toContain("set status = 'failed'");
    expect(statements).toContain("set status = 'queued'");
    expect(statements).toContain('delete from chat_jobs');
  });
});

describe('default chat job store selection', () => {
  it('uses an in-memory store in memory mode and a Neon query otherwise', () => {
    const previousPersistence = process.env.WORKBRIDGE_PERSISTENCE;
    const previousDatabaseUrl = process.env.DATABASE_URL;
    try {
      process.env.WORKBRIDGE_PERSISTENCE = 'memory';
      resetChatJobStore();
      const memory = getChatJobStore();
      expect(getChatJobStore()).toBe(memory);
      expect(memory).toBeInstanceOf(Object);

      process.env.WORKBRIDGE_PERSISTENCE = 'neon';
      delete process.env.DATABASE_URL;
      resetChatJobStore();
      expect(() => getChatJobStore()).toThrow('DATABASE_URL is not configured');
    } finally {
      if (previousPersistence === undefined) delete process.env.WORKBRIDGE_PERSISTENCE;
      else process.env.WORKBRIDGE_PERSISTENCE = previousPersistence;
      if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = previousDatabaseUrl;
      resetChatJobStore();
    }
  });

  it('refuses to build a Neon query without a connection string', () => {
    expect(() => createNeonChatJobQuery('')).toThrow('DATABASE_URL is not configured');
  });
});
