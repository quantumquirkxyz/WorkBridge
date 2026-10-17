import { randomUUID } from 'node:crypto';
import { createOpenRouterChat, type ChatFn } from '@workbridge/agent-runtime';
import { handleChatTurn, type AsyncChatStore } from './chat-handler';
import { chatSessionStore } from './chat-store';
import type { CandidateContext } from './chat/prompt';
import { getChatJobStore, type ChatJob, type ChatJobError, type ChatJobStore } from './chat-jobs';
import { candidateHash, observeChatJob } from './chat-observability';

/** A claimed job is reclaimable by another worker once this lease elapses. */
export const DEFAULT_LEASE_MS = 30_000;

export interface ChatWorkerDeps {
  jobs?: ChatJobStore;
  sessionStore?: AsyncChatStore;
  chat?: ChatFn;
  context?: CandidateContext;
  contextFor?: (candidateId: string) => CandidateContext | Promise<CandidateContext>;
  leaseOwner?: string;
  leaseMs?: number;
  now?: () => number;
  log?: (entry: Record<string, unknown>) => void;
}

export interface ChatJobOutcome {
  outcome: 'idle' | 'succeeded' | 'failed' | 'retried';
  jobId?: string;
}

/** Build the shared model seam from the environment; undefined means the deterministic fallback. */
export function createChatFnFromEnv(env: NodeJS.ProcessEnv = process.env): ChatFn | undefined {
  const apiKey = env.OPENROUTER_API_KEY;
  if (!apiKey) return undefined;
  return createOpenRouterChat({
    apiKey,
    model: env.OPENROUTER_MODEL ?? 'openai/gpt-4o-mini',
    baseUrl: env.OPENROUTER_BASE_URL,
  });
}

async function settle(
  jobs: ChatJobStore,
  job: ChatJob,
  error: ChatJobError,
  log: (entry: Record<string, unknown>) => void,
  durationSeconds?: number,
): Promise<ChatJobOutcome> {
  if (error.retryable && job.attempts < job.maxAttempts) {
    if (error.code !== 'session_version_pending') observeChatJob('worker_error');
    const backoffMs = ([1000, 5000, 30000][Math.min(job.attempts - 1, 2)] ?? 30000) + Math.floor(Math.random() * 250);
    await jobs.release(job.jobId, backoffMs, durationSeconds, error.code);
    log({ event: 'chat_job_retry', jobId: job.jobId, attempts: job.attempts, code: error.code, backoffMs });
    return { outcome: 'retried', jobId: job.jobId };
  }
  await jobs.fail(job.jobId, error, job.leaseOwner, durationSeconds);
  observeChatJob('dead_letter');
  log({ event: 'chat_job_failed', jobId: job.jobId, attempts: job.attempts, code: error.code });
  return { outcome: 'failed', jobId: job.jobId };
}

function executionFailure(cause: unknown): ChatJobError {
  // Provider failures are deliberately reduced to a safe retryable error. The
  // original cause must never reach the job row or the candidate-facing API.
  const message = cause instanceof Error ? cause.message : '';
  const retryable =
    message === 'chat_timeout' ||
    message === 'chat_failed' ||
    message === 'persistence_unavailable' ||
    /timeout|timed out|network|fetch|socket|reset|unavailable/i.test(message);
  return {
    code: retryable && /timeout|timed out/i.test(message) ? 'provider_timeout' : retryable ? 'chat_execution_retryable' : 'chat_execution_failed',
    message: retryable ? 'The chat provider could not complete the turn.' : 'The chat turn could not be completed.',
    retryable,
  };
}

/**
 * Claim one job with a lease and execute the existing chat seam. The job is
 * acknowledged (marked succeeded) only after `handleChatTurn` committed the
 * optimistic chat session, so a crashed or losing worker never loses a turn.
 */
export async function processOneChatJob(deps: ChatWorkerDeps = {}): Promise<ChatJobOutcome> {
  const jobs = deps.jobs ?? getChatJobStore();
  const sessionStore = deps.sessionStore ?? chatSessionStore;
  const now = deps.now ?? Date.now;
  const log = deps.log ?? ((entry) => console.info(JSON.stringify(entry)));
  const leaseOwner = deps.leaseOwner ?? `worker-${randomUUID()}`;

  const job = await jobs.claimNext({ leaseOwner, leaseMs: deps.leaseMs ?? DEFAULT_LEASE_MS, now: now() });
  if (!job) return { outcome: 'idle' };
  const startedAt = now();
  observeChatJob('attempt');
  const safeLog = (entry: Record<string, unknown>) => log({ requestId: job.requestId, traceId: job.traceId, jobId: job.jobId, candidateHash: candidateHash(job.candidateId), ...entry });
  const durationSeconds = () => (now() - startedAt) / 1000;

  // Ordered per candidate by session version: a genuinely stale action is
  // terminal, while a future version waits for its earlier turn.
  let currentVersion: number;
  try {
    currentVersion = (await sessionStore.get(job.candidateId))?.version ?? 0;
  } catch {
    return settle(
      jobs,
      job,
      { code: 'persistence_unavailable', message: 'The chat session store is unavailable.', retryable: true },
      safeLog,
      durationSeconds(),
    );
  }
  if (currentVersion > job.sessionVersion) {
    await jobs.fail(job.jobId, {
      code: 'session_version_conflict',
      message: 'The chat session changed before this turn was applied.',
      retryable: false,
    }, job.leaseOwner);
    observeChatJob('session_conflict');
    safeLog({ event: 'chat_job_failed', code: 'session_version_conflict' });
    return { outcome: 'failed', jobId: job.jobId };
  }
  if (currentVersion < job.sessionVersion) {
    return settle(
      jobs,
      job,
      { code: 'session_version_pending', message: 'An earlier chat turn must complete first.', retryable: true },
      safeLog,
      durationSeconds(),
    );
  }

  let context: CandidateContext | undefined;
  try {
    context = deps.contextFor ? await deps.contextFor(job.candidateId) : deps.context;
  } catch {
    return settle(
      jobs,
      job,
      { code: 'persistence_unavailable', message: 'The chat session store is unavailable.', retryable: true },
      safeLog,
      durationSeconds(),
    );
  }

  let status: number;
  let body: unknown;
  try {
    ({ status, body } = await handleChatTurn(job.candidateId, job.payload, {
      chat: deps.chat ?? createChatFnFromEnv(),
      store: sessionStore,
      context,
    }));
  } catch (cause) {
    if (cause instanceof Error && /timeout/i.test(cause.message)) observeChatJob('provider_timeout');
    return settle(jobs, job, executionFailure(cause), safeLog, durationSeconds());
  }

  if (status === 200) {
    try {
        await jobs.succeed(job.jobId, body, job.leaseOwner, durationSeconds());
    } catch {
      // The session is already committed. Do not report success or execute the
      // action again; release the acknowledgement lease so a later worker can
      // retry the durable acknowledgement safely.
      try {
        await jobs.release(job.jobId);
      } catch {
        safeLog({ event: 'chat_job_acknowledgement_unavailable' });
      }
      safeLog({ event: 'chat_job_acknowledgement_retry' });
      return { outcome: 'retried', jobId: job.jobId };
    }
    observeChatJob('duration', (now() - startedAt) / 1000);
    safeLog({ event: 'chat_job_succeeded', sessionVersion: job.sessionVersion });
    return { outcome: 'succeeded', jobId: job.jobId };
  }
  if (status === 400) {
    return settle(jobs, job, { code: 'invalid_chat_request', message: 'The queued chat action is invalid.', retryable: false }, safeLog, durationSeconds());
  }
  if (status === 409) {
    return settle(
      jobs,
      job,
      { code: 'session_version_conflict', message: 'The chat session changed before this turn was applied.', retryable: false },
      safeLog,
      durationSeconds(),
    );
  }
  observeChatJob('worker_error');
  return settle(jobs, job, { code: 'chat_execution_failed', message: 'The chat turn could not be completed.', retryable: true }, safeLog, durationSeconds());
}
