import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { candidateIdFromRequestOrSession } from '../../../../../../lib/candidate-session';
import { chatTurnError, readChatTurnStatus } from '../../../../../../lib/chat-turns-handler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ jobId: string }> };

/**
 * Owning-candidate status read (spec #90). Returns queued/running/succeeded/failed;
 * `ChatTurn` only for succeeded and a safe structured error only for failed.
 */
export async function GET(request: Request, context: RouteContext): Promise<Response> {
  const requestId = request.headers.get('x-request-id') ?? randomUUID();
  const candidateId = await candidateIdFromRequestOrSession(request);
  if (!candidateId) {
    return NextResponse.json(
      chatTurnError('unauthorized', 'A candidate session is required.', { status: 401, requestId }).body,
      { status: 401 },
    );
  }

  const { jobId } = await context.params;
  const { status, body } = await readChatTurnStatus(candidateId, jobId, { requestId });
  const responseBody = body as Record<string, unknown>;
  const jobStatus = typeof responseBody.status === 'string' ? responseBody.status : undefined;
  const headers = new Headers();
  if (jobStatus === 'queued' || jobStatus === 'running') headers.set('Retry-After', '1');
  return NextResponse.json(responseBody, { status, headers });
}
