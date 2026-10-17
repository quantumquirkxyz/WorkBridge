import { randomUUID } from 'node:crypto';
import type { HandlerResult } from './handler-result';
import { MAX_MESSAGE_LENGTH, parseChatAction } from './chat-handler';
import { ChatJobBackpressureError, getChatJobStore, type ChatJob, type ChatJobStore } from './chat-jobs';

/** Upper bound on a candidate id accepted by the versioned chat seam. */
export const MAX_CANDIDATE_ID_LENGTH = 128;
/** Upper bound on a client-supplied idempotency key, so it cannot be used as a payload channel. */
export const MAX_IDEMPOTENCY_KEY_LENGTH = 200;

/** Documented versioned-API error shape: `{ error: { code, message, retryable, requestId } }`. */
export interface ChatTurnErrorBody {
  error: { code: string; message: string; retryable: boolean; requestId: string };
}

export function chatTurnError(
  code: string,
  message: string,
  options: { status: number; requestId: string; retryable?: boolean },
): HandlerResult {
  const body: ChatTurnErrorBody = {
    error: { code, message, retryable: options.retryable ?? false, requestId: options.requestId },
  };
  return { status: options.status, body };
}

interface ParsedChatTurnRequest {
  message: string;
  action: unknown;
  sessionVersion: number;
}

/**
 * Validate the enqueue body. Ownership is deliberately absent: the caller can
 * never name a candidate, only the server session can.
 */
function parseChatTurnRequest(payload: unknown): ParsedChatTurnRequest | undefined {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return undefined;
  const body = payload as Record<string, unknown>;
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  const action = parseChatAction(body.action);
  const sessionVersion = body.sessionVersion;
  if (!message || message.length > MAX_MESSAGE_LENGTH || !action) return undefined;
  if (typeof sessionVersion !== 'number' || !Number.isInteger(sessionVersion) || sessionVersion < 0) return undefined;
  return { message, action, sessionVersion };
}

export interface EnqueueChatTurnDeps {
  store?: ChatJobStore;
  requestId?: string;
  traceId?: string;
}

/**
 * Authenticated enqueue seam: one validated chat action becomes one durable job
 * owned by the session candidate. A repeated idempotency key returns the same job.
 */
export async function enqueueChatTurn(
  candidateId: string,
  idempotencyKey: string | undefined,
  payload: unknown,
  deps: EnqueueChatTurnDeps = {},
): Promise<HandlerResult> {
  const requestId = deps.requestId ?? randomUUID();
  if (!candidateId || candidateId.length > MAX_CANDIDATE_ID_LENGTH) {
    return chatTurnError('invalid_candidate_id', 'Candidate identity is invalid.', { status: 400, requestId });
  }

  const key = typeof idempotencyKey === 'string' ? idempotencyKey.trim() : '';
  if (!key || key.length > MAX_IDEMPOTENCY_KEY_LENGTH) {
    return chatTurnError(
      'invalid_idempotency_key',
      'A non-empty Idempotency-Key header of at most 200 characters is required.',
      { status: 400, requestId },
    );
  }

  const parsed = parseChatTurnRequest(payload);
  if (!parsed) {
    return chatTurnError(
      'invalid_chat_request',
      'The chat action, message, or session version is invalid.',
      { status: 400, requestId },
    );
  }

  const store = deps.store ?? getChatJobStore();
  let job: ChatJob;
  let created = true;
  try {
    ({ job, created } = await store.enqueue({
      candidateId,
      idempotencyKey: key,
      sessionVersion: parsed.sessionVersion,
      payload: { message: parsed.message, action: parsed.action },
      traceId: deps.traceId ?? requestId,
      requestId,
      enforceAdmission: true,
    }));
  } catch (error) {
    if (error instanceof ChatJobBackpressureError) {
      const result = chatTurnError('chat_backpressure', 'Another chat turn is already being processed.', { status: 429, requestId, retryable: true });
      return { ...result, headers: { 'Retry-After': String(error.retryAfterSeconds) } };
    }
    return chatTurnError('queue_unavailable', 'The chat queue is temporarily unavailable.', {
      status: 503,
      requestId,
      retryable: true,
    });
  }

  if (!created && job.status === 'succeeded') {
    return {
      status: 200,
      body: {
        jobId: job.jobId,
        status: job.status,
        statusUrl: `/api/v1/chat/turns/${encodeURIComponent(job.jobId)}`,
        requestId: job.requestId,
        sessionVersion: job.sessionVersion,
        result: job.result ?? null,
      },
    };
  }

  return {
    status: 202,
    body: {
      jobId: job.jobId,
      status: job.status,
      statusUrl: `/api/v1/chat/turns/${encodeURIComponent(job.jobId)}`,
      requestId: job.requestId,
      sessionVersion: job.sessionVersion,
    },
  };
}

export interface ReadChatTurnDeps {
  store?: ChatJobStore;
  requestId?: string;
}

/**
 * Owning-candidate status read. A job owned by anyone else is reported as not
 * found, so the endpoint cannot be used to enumerate other candidates' jobs.
 */
export async function readChatTurnStatus(
  candidateId: string,
  jobId: string,
  deps: ReadChatTurnDeps = {},
): Promise<HandlerResult> {
  const requestId = deps.requestId ?? randomUUID();
  if (!candidateId || candidateId.length > MAX_CANDIDATE_ID_LENGTH) {
    return chatTurnError('invalid_candidate_id', 'Candidate identity is invalid.', { status: 400, requestId });
  }

  const store = deps.store ?? getChatJobStore();
  let job: ChatJob | undefined;
  try {
    job = await store.get(jobId);
  } catch {
    return chatTurnError('queue_unavailable', 'The chat queue is temporarily unavailable.', {
      status: 503,
      requestId,
      retryable: true,
    });
  }

  if (!job || job.candidateId !== candidateId) {
    return chatTurnError('job_not_found', 'No chat job exists for this candidate.', { status: 404, requestId });
  }

  const body: Record<string, unknown> = {
    jobId: job.jobId,
    status: job.status,
    requestId: job.requestId,
    sessionVersion: job.sessionVersion,
  };
  if (job.status === 'succeeded') body.result = job.result ?? null;
  if (job.status === 'failed') {
    body.error = { ...(job.error ?? { code: 'chat_execution_failed', message: 'The chat turn failed.', retryable: false }), requestId: job.requestId };
  }
  return { status: 200, body };
}
