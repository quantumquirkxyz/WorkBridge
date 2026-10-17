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
  return NextResponse.json(body, { status });
}
