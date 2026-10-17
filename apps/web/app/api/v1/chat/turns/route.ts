import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { candidateIdFromRequestOrSession } from '../../../../../lib/candidate-session';
import {
  MAX_CANDIDATE_ID_LENGTH,
  chatTurnError,
  enqueueChatTurn,
} from '../../../../../lib/chat-turns-handler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Versioned async chat enqueue (spec #90). Authenticates the candidate from the
 * server session, validates the action and session version, persists one durable
 * job, and returns 202 with the job handle. Never trusts caller-supplied ownership.
 */
export async function POST(request: Request): Promise<Response> {
  const requestId = request.headers.get('x-request-id') ?? randomUUID();
  const candidateId = await candidateIdFromRequestOrSession(request);
  if (!candidateId) {
    return NextResponse.json(
      chatTurnError('unauthorized', 'A candidate session is required.', { status: 401, requestId }).body,
      { status: 401 },
    );
  }
  if (candidateId.length > MAX_CANDIDATE_ID_LENGTH) {
    return NextResponse.json(
      chatTurnError('invalid_candidate_id', 'Candidate identity is invalid.', { status: 400, requestId }).body,
      { status: 400 },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      chatTurnError('invalid_json', 'The request body must be valid JSON.', { status: 400, requestId }).body,
      { status: 400 },
    );
  }

  const idempotencyKey = request.headers.get('idempotency-key') ?? undefined;
  const { status, body, headers } = await enqueueChatTurn(candidateId, idempotencyKey, payload, {
    requestId,
    traceId: request.headers.get('x-trace-id') ?? requestId,
  });
  return NextResponse.json(body, { status, headers });
}
