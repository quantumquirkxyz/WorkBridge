import { randomUUID } from 'node:crypto';
import { neon } from '@neondatabase/serverless';

/** Number of execution attempts (including the first) before a transient failure is terminal. */
export const DEFAULT_MAX_ATTEMPTS = 3;

export type ChatJobStatus = 'queued' | 'running' | 'succeeded' | 'failed';

/** Safe terminal error surfaced to the owning candidate; never carries provider or SQL detail. */
export interface ChatJobError {
  code: string;
  message: string;
  retryable: boolean;
}

/** The validated chat action enqueued by the BFF and replayed by the worker. */
export interface ChatJobPayload {
  message: string;
  action: unknown;
}

export interface ChatJob {
  jobId: string;
  candidateId: string;
  idempotencyKey: string;
  sessionVersion: number;
  payload: ChatJobPayload;
  status: ChatJobStatus;
  attempts: number;
  maxAttempts: number;
  leaseOwner?: string;
  leaseExpiresAt?: string;
  nextAttemptAt?: string;
  traceId: string;
  requestId: string;
  result?: unknown;
  error?: ChatJobError;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  finishedAt?: string;
}

export interface EnqueueChatJobInput {
  candidateId: string;
  idempotencyKey: string;
  sessionVersion: number;
  payload: ChatJobPayload;
  traceId: string;
  requestId: string;
  maxAttempts?: number;
  enforceAdmission?: boolean;
}

export interface EnqueueChatJobResult {
  job: ChatJob;
  /** False when an existing job already matched (candidate_id, idempotency_key). */
  created: boolean;
}

export class ChatJobBackpressureError extends Error {
  readonly retryAfterSeconds = 1;
  constructor() { super('chat_job_backpressure'); this.name = 'ChatJobBackpressureError'; }
}

export interface ClaimChatJobOptions {
  leaseOwner: string;
  leaseMs: number;
  /** Test seam for time; the SQL store uses the database clock. */
  now?: number;
}

/**
 * The queue data plane. `enqueue` is idempotent per (candidate, key); `claimNext`
 * takes a lease so a crashed worker's job becomes claimable again once it expires.
 */
export interface ChatJobStore {
  enqueue(input: EnqueueChatJobInput): Promise<EnqueueChatJobResult>;
  findByIdempotencyKey(candidateId: string, idempotencyKey: string): Promise<ChatJob | undefined>;
  get(jobId: string): Promise<ChatJob | undefined>;
  claimNext(options: ClaimChatJobOptions): Promise<ChatJob | undefined>;
  succeed(jobId: string, result: unknown, leaseOwner?: string): Promise<void>;
  fail(jobId: string, error: ChatJobError, leaseOwner?: string): Promise<void>;
  /** Release a lease without completing, so a transient failure can be retried. */
  release(jobId: string, delayMs?: number): Promise<void>;
  deleteByCandidate(candidateId: string): Promise<void>;
}

export function createInMemoryChatJobStore(): ChatJobStore {
  const jobs = new Map<string, ChatJob>();
  const idempotency = new Map<string, string>();
  const admissionOrder = new Map<string, number>();
  let nextAdmissionOrder = 0;
  const key = (candidateId: string, idempotencyKey: string) => `${candidateId}\u0000${idempotencyKey}`;
  const clone = <T>(value: T): T => structuredClone(value);

  const claimable = (job: ChatJob, at: number): boolean =>
    job.status === 'queued' ||
    (job.status === 'running' && job.leaseExpiresAt !== undefined && Date.parse(job.leaseExpiresAt) <= at);

  return {
    async enqueue(input) {
      const existingId = idempotency.get(key(input.candidateId, input.idempotencyKey));
      if (existingId) {
        const existing = jobs.get(existingId);
        if (existing) return { job: clone(existing), created: false };
      }
      if (input.enforceAdmission && [...jobs.values()].some((candidate) => candidate.candidateId === input.candidateId && (candidate.status === 'queued' || candidate.status === 'running'))) {
        throw new ChatJobBackpressureError();
      }
      const now = new Date().toISOString();
      const job: ChatJob = {
        jobId: `chatjob_${randomUUID()}`,
        candidateId: input.candidateId,
        idempotencyKey: input.idempotencyKey,
        sessionVersion: input.sessionVersion,
        payload: clone(input.payload),
        status: 'queued',
        attempts: 0,
        maxAttempts: input.maxAttempts ?? DEFAULT_MAX_ATTEMPTS,
        traceId: input.traceId,
        requestId: input.requestId,
        createdAt: now,
        updatedAt: now,
      };
      jobs.set(job.jobId, job);
      admissionOrder.set(job.jobId, nextAdmissionOrder++);
      idempotency.set(key(job.candidateId, job.idempotencyKey), job.jobId);
      return { job: clone(job), created: true };
    },

    async findByIdempotencyKey(candidateId, idempotencyKey) {
      const id = idempotency.get(key(candidateId, idempotencyKey));
      const job = id ? jobs.get(id) : undefined;
      return job ? clone(job) : undefined;
    },

    async get(jobId) {
      const job = jobs.get(jobId);
      return job ? clone(job) : undefined;
    },

    async claimNext({ leaseOwner, leaseMs, now }) {
      const at = now ?? Date.now();
      // Admit only the oldest unfinished job for a candidate. This prevents a
      // later session version from running while an earlier turn is in flight.
      const next = [...jobs.values()].find((job) => {
        if (!claimable(job, at) || (job.nextAttemptAt !== undefined && Date.parse(job.nextAttemptAt) > at)) return false;
        return ![...jobs.values()].some(
          (earlier) =>
            earlier.jobId !== job.jobId &&
            earlier.candidateId === job.candidateId &&
            (earlier.status === 'queued' || earlier.status === 'running') &&
            (earlier.sessionVersion < job.sessionVersion ||
              (earlier.sessionVersion === job.sessionVersion &&
                (admissionOrder.get(earlier.jobId) ?? 0) < (admissionOrder.get(job.jobId) ?? 0))),
        );
      });
      if (!next) return undefined;
      next.status = 'running';
      next.attempts += 1;
      next.leaseOwner = leaseOwner;
      next.leaseExpiresAt = new Date(at + leaseMs).toISOString();
      next.startedAt ??= new Date(at).toISOString();
      next.updatedAt = new Date(at).toISOString();
      return clone(next);
    },

    async succeed(jobId, result, leaseOwner) {
      const job = jobs.get(jobId);
      if (!job) return;
      if (leaseOwner && job.leaseOwner !== leaseOwner) return;
      job.status = 'succeeded';
      job.result = clone(result);
      delete job.error;
      delete job.leaseOwner;
      delete job.leaseExpiresAt;
      job.finishedAt = new Date().toISOString();
      job.updatedAt = job.finishedAt;
    },

    async fail(jobId, error, leaseOwner) {
      const job = jobs.get(jobId);
      if (!job) return;
      if (leaseOwner && job.leaseOwner !== leaseOwner) return;
      job.status = 'failed';
      job.error = { ...error };
      delete job.result;
      delete job.leaseOwner;
      delete job.leaseExpiresAt;
      job.finishedAt = new Date().toISOString();
      job.updatedAt = job.finishedAt;
    },

    async release(jobId, _delayMs = 0) {
      const job = jobs.get(jobId);
      if (!job) return;
      job.status = 'queued';
      // The in-memory adapter is a deterministic test double; production SQL
      // persists the delay in next_attempt_at.
      delete job.nextAttemptAt;
      delete job.leaseOwner;
      delete job.leaseExpiresAt;
      job.updatedAt = new Date().toISOString();
    },

    async deleteByCandidate(candidateId) {
      for (const job of [...jobs.values()]) {
        if (job.candidateId !== candidateId) continue;
        jobs.delete(job.jobId);
        admissionOrder.delete(job.jobId);
        idempotency.delete(key(job.candidateId, job.idempotencyKey));
      }
    },
  };
}

export interface SqlQuery {
  (sql: string, params: readonly unknown[]): Promise<{ rows: Array<Record<string, unknown>> }>;
}

function toIso(value: unknown): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

function mapRow(row: Record<string, unknown>): ChatJob {
  const job: ChatJob = {
    jobId: String(row.job_id),
    candidateId: String(row.candidate_id),
    idempotencyKey: String(row.idempotency_key),
    sessionVersion: Number(row.session_version),
    payload: row.payload as ChatJobPayload,
    status: row.status as ChatJobStatus,
    attempts: Number(row.attempts),
    maxAttempts: Number(row.max_attempts),
    traceId: String(row.trace_id),
    requestId: String(row.request_id),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
  if (row.lease_owner) job.leaseOwner = String(row.lease_owner);
  if (row.lease_expires_at) job.leaseExpiresAt = toIso(row.lease_expires_at);
  if (row.next_attempt_at) job.nextAttemptAt = toIso(row.next_attempt_at);
  if (row.result !== null && row.result !== undefined) job.result = row.result;
  if (row.error_code) {
    job.error = {
      code: String(row.error_code),
      message: String(row.error_message ?? ''),
      retryable: Boolean(row.error_retryable),
    };
  }
  if (row.started_at) job.startedAt = toIso(row.started_at);
  if (row.finished_at) job.finishedAt = toIso(row.finished_at);
  return job;
}

/** Postgres/Neon implementation of the queue data plane (migration 004_chat_jobs.sql). */
export function createSqlChatJobStore(query: SqlQuery): ChatJobStore {
  return {
    async enqueue(input) {
      const jobId = `chatjob_${randomUUID()}`;
      const active = input.enforceAdmission ? await query(
        `select 1 from chat_jobs where candidate_id = $1 and status in ('queued', 'running') limit 1`,
        [input.candidateId],
      ) : { rows: [] };
      if (active.rows[0]) {
        const existing = await query(
          'select 1 from chat_jobs where candidate_id = $1 and idempotency_key = $2',
          [input.candidateId, input.idempotencyKey],
        );
        if (!existing.rows[0]) throw new ChatJobBackpressureError();
      }
      const inserted = await query(
        `insert into chat_jobs
           (job_id, candidate_id, idempotency_key, session_version, payload, status, attempts, max_attempts, trace_id, request_id)
         values ($1, $2, $3, $4, $5::jsonb, 'queued', 0, $6, $7, $8)
         on conflict (candidate_id, idempotency_key) do nothing
         returning *`,
        [
          jobId,
          input.candidateId,
          input.idempotencyKey,
          input.sessionVersion,
          JSON.stringify(input.payload),
          input.maxAttempts ?? DEFAULT_MAX_ATTEMPTS,
          input.traceId,
          input.requestId,
        ],
      );
      const insertedRow = inserted.rows[0];
      if (insertedRow) return { job: mapRow(insertedRow), created: true };
      const existing = await query(
        'select * from chat_jobs where candidate_id = $1 and idempotency_key = $2',
        [input.candidateId, input.idempotencyKey],
      );
      const existingRow = existing.rows[0];
      if (!existingRow) throw new Error('chat_job_enqueue_conflict_without_row');
      return { job: mapRow(existingRow), created: false };
    },

    async findByIdempotencyKey(candidateId, idempotencyKey) {
      const result = await query(
        'select * from chat_jobs where candidate_id = $1 and idempotency_key = $2',
        [candidateId, idempotencyKey],
      );
      const row = result.rows[0];
      return row ? mapRow(row) : undefined;
    },

    async get(jobId) {
      const result = await query('select * from chat_jobs where job_id = $1', [jobId]);
      const row = result.rows[0];
      return row ? mapRow(row) : undefined;
    },

    async claimNext({ leaseOwner, leaseMs }) {
      const result = await query(
        `update chat_jobs
         set status = 'running',
             attempts = attempts + 1,
             lease_owner = $1,
             lease_expires_at = now() + ($2::text || ' milliseconds')::interval,
             started_at = coalesce(started_at, now()),
             updated_at = now()
         where job_id = (
           select candidate_job.job_id from chat_jobs candidate_job
            where (candidate_job.status = 'queued' or (candidate_job.status = 'running' and candidate_job.lease_expires_at < now()))
              and (candidate_job.next_attempt_at is null or candidate_job.next_attempt_at <= now())
             and not exists (
               select 1 from chat_jobs earlier_job
               where earlier_job.candidate_id = candidate_job.candidate_id
                 and (earlier_job.status = 'queued' or earlier_job.status = 'running')
                 and (earlier_job.session_version < candidate_job.session_version
                   or (earlier_job.session_version = candidate_job.session_version
                     and (earlier_job.created_at < candidate_job.created_at
                       or (earlier_job.created_at = candidate_job.created_at and earlier_job.job_id < candidate_job.job_id))))
             )
           order by candidate_job.session_version, candidate_job.created_at, candidate_job.job_id
           for update skip locked
           limit 1
         )
         returning *`,
        [leaseOwner, String(leaseMs)],
      );
      const row = result.rows[0];
      return row ? mapRow(row) : undefined;
    },

    async succeed(jobId, result, leaseOwner) {
      await query(
        `update chat_jobs
         set status = 'succeeded', result = $2::jsonb,
             error_code = null, error_message = null, error_retryable = null,
             lease_owner = null, lease_expires_at = null,
             finished_at = now(), updated_at = now()
          where job_id = $1 and ($3::text is null or lease_owner = $3)`,
        [jobId, JSON.stringify(result), leaseOwner ?? null],
      );
    },

    async fail(jobId, error, leaseOwner) {
      await query(
        `update chat_jobs
         set status = 'failed', result = null,
             error_code = $2, error_message = $3, error_retryable = $4,
             lease_owner = null, lease_expires_at = null,
             finished_at = now(), updated_at = now()
         where job_id = $1 and ($5::text is null or lease_owner = $5)`,
        [jobId, error.code, error.message, error.retryable, leaseOwner ?? null],
      );
    },

    async release(jobId, delayMs = 0) {
      await query(
        `update chat_jobs
         set status = 'queued', next_attempt_at = case when $2::int > 0 then now() + ($2::text || ' milliseconds')::interval else null end,
             lease_owner = null, lease_expires_at = null, updated_at = now()
         where job_id = $1`,
        [jobId, delayMs],
      );
    },

    async deleteByCandidate(candidateId) {
      await query('delete from chat_jobs where candidate_id = $1', [candidateId]);
    },
  };
}

/** Build the Neon `SqlQuery` adapter used by the default store outside memory mode. */
export function createNeonChatJobQuery(connectionString: string = process.env.DATABASE_URL ?? ''): SqlQuery {
  if (!connectionString) throw new Error('DATABASE_URL is not configured');
  const client = neon(connectionString);
  return async (sql, params) => ({
    rows: (await client.query(sql, [...params])) as Array<Record<string, unknown>>,
  });
}

function isMemoryMode(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.WORKBRIDGE_PERSISTENCE === 'memory';
}

let defaultStore: ChatJobStore | undefined;

/** Process-wide queue store: in-memory under `WORKBRIDGE_PERSISTENCE=memory`, Neon otherwise. */
export function getChatJobStore(): ChatJobStore {
  defaultStore ??= isMemoryMode()
    ? createInMemoryChatJobStore()
    : createSqlChatJobStore(createNeonChatJobQuery());
  return defaultStore;
}

/** Test seam: drop or replace the process-wide store between cases. */
export function resetChatJobStore(store?: ChatJobStore): void {
  defaultStore = store;
}
