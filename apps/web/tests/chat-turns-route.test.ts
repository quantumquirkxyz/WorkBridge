import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { signBetterAuthSession } from '@workbridge/agent-runtime';
import { makeCandidateId } from '@workbridge/domain';
import { POST } from '../app/api/v1/chat/turns/route';
import { GET } from '../app/api/v1/chat/turns/[jobId]/route';
import { createInMemoryChatJobStore, resetChatJobStore, type ChatJobStore } from '../lib/chat-jobs';

const SECRET = 'test-secret';
const OWNER = makeCandidateId('u');

let store: ChatJobStore;

function sessionHeaders(userId?: string): Record<string, string> {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (userId) {
    headers['x-better-auth-session'] = JSON.stringify(
      signBetterAuthSession(
        {
          session: { id: `session-${userId}`, userId, expiresAt: new Date(Date.now() + 60_000).toISOString() },
          user: { id: userId, email: `${userId}@example.test`, role: 'candidate' },
        },
        SECRET,
      ),
    );
  }
  return headers;
}

function post(body: unknown, options: { idempotencyKey?: string; userId?: string } = {}): Promise<Response> {
  const headers = sessionHeaders(options.userId);
  if (options.idempotencyKey) headers['idempotency-key'] = options.idempotencyKey;
  return POST(
    new Request('http://localhost/api/v1/chat/turns', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    }),
  );
}

function get(jobId: string, userId?: string): Promise<Response> {
  return GET(new Request(`http://localhost/api/v1/chat/turns/${jobId}`, { headers: sessionHeaders(userId) }), {
    params: Promise.resolve({ jobId }),
  });
}

const validBody = { message: 'hola', action: { kind: 'text' }, sessionVersion: 0 };

describe('POST /api/v1/chat/turns', () => {
  let previousPersistence: string | undefined;
  beforeAll(() => {
    previousPersistence = process.env.WORKBRIDGE_PERSISTENCE;
    process.env.WORKBRIDGE_PERSISTENCE = 'memory';
    process.env.BETTER_AUTH_SECRET = SECRET;
  });
  afterAll(() => {
    if (previousPersistence === undefined) delete process.env.WORKBRIDGE_PERSISTENCE;
    else process.env.WORKBRIDGE_PERSISTENCE = previousPersistence;
  });
  beforeEach(() => {
    store = createInMemoryChatJobStore();
    resetChatJobStore(store);
  });

  it('returns 401 without a session and does not enqueue', async () => {
    const res = await post(validBody, { idempotencyKey: 'key-1' });
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ error: { code: 'unauthorized', retryable: false } });
    expect(await store.findByIdempotencyKey(OWNER, 'key-1')).toBeUndefined();
  });

  it('requires an Idempotency-Key header', async () => {
    const res = await post(validBody, { userId: 'u' });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: { code: 'invalid_idempotency_key' } });
  });

  it('validates the action, message, and session version', async () => {
    const badAction = await post({ message: 'hola', action: { kind: 'chip', slot: 'nope' }, sessionVersion: 0 }, { userId: 'u', idempotencyKey: 'k1' });
    expect(badAction.status).toBe(400);

    const badMessage = await post({ message: '   ', action: { kind: 'text' }, sessionVersion: 0 }, { userId: 'u', idempotencyKey: 'k2' });
    expect(badMessage.status).toBe(400);

    const negativeVersion = await post({ message: 'hola', action: { kind: 'text' }, sessionVersion: -1 }, { userId: 'u', idempotencyKey: 'k3' });
    expect(negativeVersion.status).toBe(400);

    const missingVersion = await post({ message: 'hola', action: { kind: 'text' } }, { userId: 'u', idempotencyKey: 'k4' });
    expect(missingVersion.status).toBe(400);
    expect(await store.findByIdempotencyKey(OWNER, 'k1')).toBeUndefined();
  });

  it('returns 202 with the job handle owned by the session candidate', async () => {
    const res = await post(validBody, { userId: 'u', idempotencyKey: 'key-1' });
    expect(res.status).toBe(202);
    const body = (await res.json()) as { jobId: string; statusUrl: string; requestId: string; sessionVersion: number; status: string };
    expect(body.jobId).toMatch(/^chatjob_/);
    expect(body.statusUrl).toBe(`/api/v1/chat/turns/${body.jobId}`);
    expect(body.requestId).toBeTruthy();
    expect(body.sessionVersion).toBe(0);
    expect(body.status).toBe('queued');

    const job = await store.get(body.jobId);
    expect(job?.candidateId).toBe(OWNER);
  });

  it('never trusts a candidate id supplied in the body', async () => {
    const res = await post({ ...validBody, candidateId: 'candidate_victim' }, { userId: 'u', idempotencyKey: 'key-1' });
    expect(res.status).toBe(202);
    const { jobId } = (await res.json()) as { jobId: string };
    const job = await store.get(jobId);
    expect(job?.candidateId).toBe(OWNER);
    expect(await store.findByIdempotencyKey('candidate_victim', 'key-1')).toBeUndefined();
  });

  it('returns the same job for a repeated Idempotency-Key without a second turn', async () => {
    const first = (await (await post(validBody, { userId: 'u', idempotencyKey: 'key-1' })).json()) as { jobId: string };
    const second = (await (await post(validBody, { userId: 'u', idempotencyKey: 'key-1' })).json()) as { jobId: string };
    expect(second.jobId).toBe(first.jobId);
    expect((await store.findByIdempotencyKey(OWNER, 'key-1'))?.jobId).toBe(first.jobId);
  });

  it('returns the completed result when a succeeded job is replayed', async () => {
    const firstResponse = await post(validBody, { userId: 'u', idempotencyKey: 'key-result' });
    const first = (await firstResponse.json()) as { jobId: string };
    await store.claimNext({ leaseOwner: 'w1', leaseMs: 1000 });
    await store.succeed(first.jobId, { reply: 'completado', phase: 'profile' });

    const replay = await post(validBody, { userId: 'u', idempotencyKey: 'key-result' });
    expect(replay.status).toBe(200);
    expect(await replay.json()).toMatchObject({
      jobId: first.jobId,
      status: 'succeeded',
      result: { reply: 'completado', phase: 'profile' },
    });
  });
});

describe('GET /api/v1/chat/turns/{jobId}', () => {
  beforeAll(() => {
    process.env.WORKBRIDGE_PERSISTENCE = 'memory';
    process.env.BETTER_AUTH_SECRET = SECRET;
  });
  beforeEach(() => {
    store = createInMemoryChatJobStore();
    resetChatJobStore(store);
  });

  async function enqueue(idempotencyKey = 'key-1', candidateId = OWNER) {
    return store.enqueue({
      candidateId,
      idempotencyKey,
      sessionVersion: 0,
      payload: { message: 'hola', action: { kind: 'text' } },
      traceId: 'trace-1',
      requestId: 'req-1',
    });
  }

  it('returns 401 without a session', async () => {
    const { job } = await enqueue();
    const res = await get(job.jobId);
    expect(res.status).toBe(401);
  });

  it('returns 404 for an unknown job', async () => {
    const res = await get('chatjob_missing', 'u');
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ error: { code: 'job_not_found' } });
  });

  it('does not expose another candidate job', async () => {
    const { job } = await enqueue();
    const res = await get(job.jobId, 'other');
    expect(res.status).toBe(404);
  });

  it('returns the queued status for the owner', async () => {
    const { job } = await enqueue();
    const res = await get(job.jobId, 'u');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      jobId: job.jobId,
      status: 'queued',
      requestId: 'req-1',
      sessionVersion: 0,
    });
  });

  it('returns the running status for the owner', async () => {
    const { job } = await enqueue();
    await store.claimNext({ leaseOwner: 'w1', leaseMs: 1000 });
    const res = await get(job.jobId, 'u');
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ jobId: job.jobId, status: 'running' });
  });

  it('returns the ChatTurn only for a succeeded job', async () => {
    const { job } = await enqueue();
    await store.claimNext({ leaseOwner: 'w1', leaseMs: 1000 });
    await store.succeed(job.jobId, { reply: 'ok', phase: 'profile' });

    const res = await get(job.jobId, 'u');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      jobId: job.jobId,
      status: 'succeeded',
      requestId: 'req-1',
      sessionVersion: 0,
      result: { reply: 'ok', phase: 'profile' },
    });
  });

  it('returns a safe structured error for a failed job', async () => {
    const { job } = await enqueue();
    await store.claimNext({ leaseOwner: 'w1', leaseMs: 1000 });
    await store.fail(job.jobId, { code: 'session_version_conflict', message: 'conflict', retryable: false });

    const res = await get(job.jobId, 'u');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      jobId: job.jobId,
      status: 'failed',
      requestId: 'req-1',
      sessionVersion: 0,
      error: { code: 'session_version_conflict', message: 'conflict', retryable: false, requestId: 'req-1' },
    });
  });
});
