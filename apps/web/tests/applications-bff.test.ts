import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppSession } from '../lib/auth-types';

const state = vi.hoisted(() => ({ session: null as AppSession | null }));

vi.mock('../lib/auth', () => ({
  getServerSession: async () => state.session,
}));

import { GET } from '../app/api/applications/[...path]/route';

const context = { params: Promise.resolve({ path: ['drafts'] }) };

function candidateSession(): AppSession {
  return {
    session: {
      id: 'sess_1',
      userId: 'user_1',
      expiresAt: new Date('2026-12-01T00:00:00.000Z'),
    },
    user: {
      id: 'user_1',
      email: 'ana.morales@seed.workbridge.test',
      role: 'candidate',
    },
  };
}

describe('applications BFF session', () => {
  beforeEach(() => {
    state.session = null;
    process.env.AGENT_RUNTIME_URL = 'http://runtime.test';
    process.env.BETTER_AUTH_SECRET = 'test-secret';
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ drafts: [] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })));
  });

  it('returns 401 when the browser has no Better Auth session', async () => {
    const response = await GET(new Request('http://localhost/api/applications/drafts?candidateId=candidate_1'), context);
    expect(response.status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('forwards a signed session taken from the Better Auth cookie', async () => {
    state.session = candidateSession();
    const response = await GET(new Request('http://localhost/api/applications/drafts?candidateId=candidate_1'), context);
    expect(response.status).toBe(200);
    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    const forwarded = JSON.parse(String(new Headers(init.headers).get('x-better-auth-session')));
    expect(forwarded.user).toMatchObject({ id: 'user_1', role: 'candidate' });
    expect(forwarded.signature).toEqual(expect.any(String));
  });
});
