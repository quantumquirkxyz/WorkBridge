import { NextResponse } from 'next/server';
import { createOpenRouterChat } from '@puente/agent-runtime';
import { handleChatTurn, readChatSessionView } from '../../../lib/chat-handler';
import { candidateIdFromRequest, unauthorized } from '../../../lib/candidate-session';
import { MAX_CANDIDATE_ID_LENGTH } from '../../../lib/exploration-handler';
import { persistChatSession, readCandidateProfile, readChatSession } from '../../../lib/neon-repository';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const store = { get: readChatSession, save: persistChatSession };

export async function GET(request: Request): Promise<Response> {
  const candidateId = candidateIdFromRequest(request);
  if (!candidateId) return unauthorized();
  if (candidateId.length > MAX_CANDIDATE_ID_LENGTH) return NextResponse.json({ error: 'invalid_candidate_id' }, { status: 400 });
  const { status, body } = await readChatSessionView(candidateId, { store });
  return NextResponse.json(body, { status });
}

export async function POST(request: Request): Promise<Response> {
  const candidateId = candidateIdFromRequest(request);
  if (!candidateId) return unauthorized();
  if (candidateId.length > MAX_CANDIDATE_ID_LENGTH) return NextResponse.json({ error: 'invalid_candidate_id' }, { status: 400 });
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  const chat = apiKey
    ? createOpenRouterChat({
        apiKey,
        model: process.env.OPENROUTER_MODEL ?? 'openai/gpt-4o-mini',
        baseUrl: process.env.OPENROUTER_BASE_URL,
      })
    : undefined;

  // Only this candidate's own profile reaches the prompt (AC-50).
  let profile: unknown;
  try {
    profile = await readCandidateProfile(candidateId);
  } catch {
    profile = undefined;
  }

  const { status, body } = await handleChatTurn(candidateId, payload, {
    chat,
    store,
    context: { profile },
  });
  return NextResponse.json(body, { status });
}
