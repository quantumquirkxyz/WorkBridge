import { describe, expect, it } from 'vitest';
import type { ChatFn } from '@workbridge/agent-runtime';
import { processOneChatJob, type ChatWorkerDeps } from '../lib/chat-worker';
import { ChatSessionConflictError, createInMemoryChatSessionStore, type ChatSession } from '../lib/chat-store';
import { initialSlotState } from '../lib/chat/tracker';
import { createInMemoryChatJobStore, type ChatJobStore } from '../lib/chat-jobs';

const CANDIDATE = 'candidate_worker';
const VALID_OUTPUT = JSON.stringify({ intent: 'ask_slot', reply: '¿Seguimos con tu perfil?', slotUpdates: [] });

function fakeChat(content = VALID_OUTPUT): ChatFn {
  return async () => ({ content, model: 'test-model' });
}

function enqueueJob(jobs: ChatJobStore, overrides: Partial<Parameters<ChatJobStore['enqueue']>[0]> = {}) {
  return jobs.enqueue({
    candidateId: CANDIDATE,
    idempotencyKey: 'key-1',
    sessionVersion: 0,
    payload: { message: 'hola', action: { kind: 'text' } },
    traceId: 'trace-1',
    requestId: 'req-1',
    ...overrides,
  });
}

const session = (version = 0): ChatSession => ({
  transcript: [],
  slotState: initialSlotState(),
  llmTurns: 0,
  capNoticeSent: false,
  version,
});

describe('processOneChatJob', () => {
  it('returns idle when no job is claimable', async () => {
    const jobs = createInMemoryChatJobStore();
    const outcome = await processOneChatJob({ jobs, sessionStore: createInMemoryChatSessionStore() });
    expect(outcome).toEqual({ outcome: 'idle' });
  });

  it('commits the chat session and only then marks the job succeeded', async () => {
    const events: string[] = [];
    const realSessions = createInMemoryChatSessionStore();
    const sessions = {
      get: (id: string) => realSessions.get(id),
      save: (id: string, s: ChatSession) => {
        events.push('save');
        return realSessions.save(id, s);
      },
    };
    const realJobs = createInMemoryChatJobStore();
    const jobs: ChatJobStore = {
      ...realJobs,
      succeed: async (id, result) => {
        events.push('succeed');
        return realJobs.succeed(id, result);
      },
    };
    const { job } = await enqueueJob(jobs);

    const outcome = await processOneChatJob({ jobs, sessionStore: sessions, chat: fakeChat(), context: {} });

    expect(outcome).toEqual({ outcome: 'succeeded', jobId: job.jobId });
    const stored = await jobs.get(job.jobId);
    expect(stored?.status).toBe('succeeded');
    expect(stored?.result).toMatchObject({ reply: '¿Seguimos con tu perfil?', source: 'llm' });
    const committed = await realSessions.get(CANDIDATE);
    expect(committed?.version).toBe(1);
    expect(events).toEqual(['save', 'succeed']);
  });

  it('releases the acknowledgement lease when succeed fails after session commit', async () => {
    const realJobs = createInMemoryChatJobStore();
    const realSessions = createInMemoryChatSessionStore();
    const events: string[] = [];
    const jobs: ChatJobStore = {
      ...realJobs,
      succeed: async () => {
        events.push('succeed');
        throw new Error('acknowledgement unavailable');
      },
      release: async (jobId) => {
        events.push('release');
        return realJobs.release(jobId);
      },
    };
    const { job } = await enqueueJob(jobs);

    const outcome = await processOneChatJob({ jobs, sessionStore: realSessions, chat: fakeChat() });

    expect(outcome).toEqual({ outcome: 'retried', jobId: job.jobId });
    expect(events).toEqual(['succeed', 'release']);
    expect((await realSessions.get(CANDIDATE))?.version).toBe(1);
    expect((await jobs.get(job.jobId))?.status).toBe('queued');
  });

  it('does not acknowledge a job whose session commit conflicts', async () => {
    const jobs = createInMemoryChatJobStore();
    let reads = 0;
    const conflicting = {
      get: async () => {
        reads += 1;
        return reads === 1 ? undefined : session(5);
      },
      save: async () => {
        throw new ChatSessionConflictError();
      },
    };
    const { job } = await enqueueJob(jobs);

    const outcome = await processOneChatJob({ jobs, sessionStore: conflicting, chat: fakeChat() });

    expect(outcome).toEqual({ outcome: 'failed', jobId: job.jobId });
    const stored = await jobs.get(job.jobId);
    expect(stored?.status).toBe('failed');
    expect(stored?.error?.code).toBe('session_version_conflict');
    expect(stored?.result).toBeUndefined();
  });

  it('fails a stale session version without executing the turn', async () => {
    const jobs = createInMemoryChatJobStore();
    const sessions = createInMemoryChatSessionStore();
    await sessions.save(CANDIDATE, session(0)); // stored version becomes 1
    const { job } = await enqueueJob(jobs, { sessionVersion: 0 });
    let calls = 0;
    const chat: ChatFn = async () => {
      calls += 1;
      return { content: VALID_OUTPUT, model: 'test-model' };
    };

    const outcome = await processOneChatJob({ jobs, sessionStore: sessions, chat });

    expect(outcome).toEqual({ outcome: 'failed', jobId: job.jobId });
    expect(calls).toBe(0);
    expect((await jobs.get(job.jobId))?.error?.code).toBe('session_version_conflict');
  });

  it('keeps a future session version queued until the earlier turn completes', async () => {
    const jobs = createInMemoryChatJobStore();
    const sessions = createInMemoryChatSessionStore();
    const first = await enqueueJob(jobs, { idempotencyKey: 'key-first', sessionVersion: 0 });
    const later = await enqueueJob(jobs, { idempotencyKey: 'key-later', sessionVersion: 1 });
    const firstClaim = await jobs.claimNext({ leaseOwner: 'w1', leaseMs: 1000, now: 1000 });
    expect(firstClaim?.jobId).toBe(first.job.jobId);

    const beforeCommit = await processOneChatJob({ jobs, sessionStore: sessions, chat: fakeChat(), now: () => 1000 });
    expect(beforeCommit.outcome).toBe('idle');
    expect((await jobs.get(later.job.jobId))?.status).toBe('queued');

    await jobs.release(first.job.jobId);
    await processOneChatJob({ jobs, sessionStore: sessions, chat: fakeChat(), now: () => 2000 });
    const afterFirst = await sessions.get(CANDIDATE);
    expect(afterFirst?.version).toBe(1);

    const second = await processOneChatJob({ jobs, sessionStore: sessions, chat: fakeChat(), now: () => 3000 });
    expect(second.outcome).toBe('succeeded');
    expect(second.jobId).toBe(later.job.jobId);
    expect((await jobs.get(later.job.jobId))?.status).toBe('succeeded');
  });

  it('retries a transient failure and makes it terminal after max attempts', async () => {
    const jobs = createInMemoryChatJobStore();
    const unavailable = {
      get: async () => {
        throw new Error('session store down');
      },
      save: async () => undefined,
    };
    const { job } = await enqueueJob(jobs);
    const deps: ChatWorkerDeps = { jobs, sessionStore: unavailable };

    expect((await processOneChatJob(deps)).outcome).toBe('retried');
    expect((await jobs.get(job.jobId))?.status).toBe('queued');
    expect((await processOneChatJob(deps)).outcome).toBe('retried');
    expect((await processOneChatJob(deps)).outcome).toBe('failed');

    const stored = await jobs.get(job.jobId);
    expect(stored?.status).toBe('failed');
    expect(stored?.attempts).toBe(3);
    expect(stored?.error).toEqual({ code: 'persistence_unavailable', message: 'The chat session store is unavailable.', retryable: true });
  });

  it('requeues a worker exception from context loading instead of stranding the lease', async () => {
    const jobs = createInMemoryChatJobStore();
    const sessions = createInMemoryChatSessionStore();
    const { job } = await enqueueJob(jobs);

    const outcome = await processOneChatJob({
      jobs,
      sessionStore: sessions,
      contextFor: async () => {
        throw new Error('database temporarily unavailable');
      },
    });

    expect(outcome).toEqual({ outcome: 'retried', jobId: job.jobId });
    expect((await jobs.get(job.jobId))?.status).toBe('queued');
    expect((await jobs.get(job.jobId))?.leaseOwner).toBeUndefined();
  });

  it('requeues handler failures and records a safe terminal error after exhaustion', async () => {
    const jobs = createInMemoryChatJobStore();
    let reads = 0;
    const sessions = {
      get: async () => {
        reads += 1;
        if (reads % 2 === 1) return undefined;
        throw new Error('unexpected handler failure');
      },
      save: async () => undefined,
    };
    const { job } = await enqueueJob(jobs);

    expect((await processOneChatJob({ jobs, sessionStore: sessions, chat: fakeChat() })).outcome).toBe('retried');
    expect((await processOneChatJob({ jobs, sessionStore: sessions, chat: fakeChat() })).outcome).toBe('retried');
    expect((await processOneChatJob({ jobs, sessionStore: sessions, chat: fakeChat() })).outcome).toBe('failed');

    const stored = await jobs.get(job.jobId);
    expect(stored?.status).toBe('failed');
    expect(stored?.error).toEqual({
      code: 'chat_execution_failed',
      message: 'The chat turn could not be completed.',
      retryable: true,
    });
  });

  it('fails an invalid queued action terminally', async () => {
    const jobs = createInMemoryChatJobStore();
    const sessions = createInMemoryChatSessionStore();
    const { job } = await enqueueJob(jobs, { payload: { message: '', action: { kind: 'text' } } });

    const outcome = await processOneChatJob({ jobs, sessionStore: sessions, chat: fakeChat() });

    expect(outcome).toEqual({ outcome: 'failed', jobId: job.jobId });
    const stored = await jobs.get(job.jobId);
    expect(stored?.status).toBe('failed');
    expect(stored?.error?.code).toBe('invalid_chat_request');
    expect(stored?.attempts).toBe(1);
  });
});
