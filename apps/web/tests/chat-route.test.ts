import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { POST } from '../app/api/chat/route';
import { readChatSession, deleteCandidateData, persistChatSession } from '../lib/neon-repository';

const session = { transcript: [], slotState: undefined as never, llmTurns: 0, capNoticeSent: false, version: 0 };

function post(body: unknown, candidateId?: string): Request {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (candidateId) headers['x-better-auth-session'] = JSON.stringify({ user: { id: 'u', candidateId } });
  return new Request('http://localhost/api/chat', { method: 'POST', headers, body: JSON.stringify(body) });
}

describe('POST /api/chat identity', () => {
  let previous: string | undefined;
  beforeAll(() => {
    previous = process.env.PUENTE_PERSISTENCE;
    process.env.PUENTE_PERSISTENCE = 'memory';
  });
  afterAll(() => {
    if (previous === undefined) delete process.env.PUENTE_PERSISTENCE;
    else process.env.PUENTE_PERSISTENCE = previous;
  });

  it('returns 401 when there is no session, even if the body names a candidate', async () => {
    const res = await POST(post({ message: 'hola', candidateId: 'candidate_victim' }));
    expect(res.status).toBe(401);
    expect(await readChatSession('candidate_victim')).toBeUndefined();
  });

  it('uses the session candidate and never the candidate id from the body', async () => {
    const res = await POST(post({ message: 'hola', candidateId: 'candidate_victim' }, 'candidate_owner'));
    expect(res.status).toBe(200);
    expect(await readChatSession('candidate_owner')).toBeDefined();
    expect(await readChatSession('candidate_victim')).toBeUndefined();
  });
});

describe('deleteCandidateData', () => {
  it('removes chat sessions in memory mode', async () => {
    const previous = process.env.PUENTE_PERSISTENCE;
    process.env.PUENTE_PERSISTENCE = 'memory';
    try {
      await persistChatSession('candidate_delete_me', { ...session, slotState: {} as never });
      expect(await readChatSession('candidate_delete_me')).toBeDefined();
      await deleteCandidateData('candidate_delete_me');
      expect(await readChatSession('candidate_delete_me')).toBeUndefined();
    } finally {
      if (previous === undefined) delete process.env.PUENTE_PERSISTENCE;
      else process.env.PUENTE_PERSISTENCE = previous;
    }
  });
});
