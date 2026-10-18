import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const { getServerSession } = vi.hoisted(() => ({ getServerSession: vi.fn() }));
vi.mock('../lib/auth', () => ({ getServerSession }));
import { GET } from '../app/api/applications/[...path]/route';

describe('employer shortlist BFF', () => {
  beforeEach(() => {
    vi.stubEnv('AGENT_RUNTIME_URL', 'https://runtime.test');
    vi.stubEnv('BETTER_AUTH_SECRET', 'proxy-test-secret');
    getServerSession.mockReset();
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  it('rejects anonymous and candidate sessions without trusting a forged employer header', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const request = () => new Request('https://app.test/api/applications/vacancies/vac-1/shortlist', {
      headers: { 'x-better-auth-session': JSON.stringify({ session: { id: 'fake' }, user: { id: 'fake', role: 'employer' } }) },
    });
    const context = { params: Promise.resolve({ path: ['vacancies', 'vac-1', 'shortlist'] }) };
    getServerSession.mockResolvedValueOnce(null);
    expect((await GET(request(), context)).status).toBe(401);
    getServerSession.mockResolvedValueOnce({ user: { id: 'candidate', role: 'candidate' } });
    expect((await GET(request(), context)).status).toBe(403);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('forwards the authenticated employer organization and preserves runtime ownership rejection', async () => {
    getServerSession.mockResolvedValue({
      session: { id: 'real', expiresAt: new Date('2027-01-01') },
      user: { id: 'employer', email: 'employer@example.test', role: 'employer', employerOrgId: 'org-real' },
    });
    const fetch = vi.fn().mockResolvedValue(new Response('{"error":"forbidden"}', { status: 403 }));
    vi.stubGlobal('fetch', fetch);
    const response = await GET(new Request('https://app.test/api/applications/vacancies/foreign/shortlist'), {
      params: Promise.resolve({ path: ['vacancies', 'foreign', 'shortlist'] }),
    });
    expect(response.status).toBe(403);
    const [url, init] = fetch.mock.calls[0]!;
    expect(String(url)).toContain('https://runtime.test/vacancies/foreign/shortlist');
    const forwarded = JSON.parse((init.headers as Headers).get('x-better-auth-session')!);
    expect(forwarded.user.employerOrgId).toBe('org-real');
    expect(forwarded.signature).toBeTruthy();
  });

  it('rejects dot-segment aliases before URL normalization can bypass shortlist authentication', async () => {
    getServerSession.mockResolvedValue(null);
    const fetch = vi.fn().mockResolvedValue(new Response('{"shortlist":[]}', { status: 200 }));
    vi.stubGlobal('fetch', fetch);
    const request = new Request('https://app.test/api/applications/vacancies/lnk-1001/shortlist', {
      headers: { 'x-better-auth-session': JSON.stringify({
        session: { id: 'forged', userId: 'forged', expiresAt: '2027-01-01T00:00:00.000Z' },
        user: { id: 'forged', email: 'forged@example.test', role: 'employer', employerOrgId: 'org-real' },
      }) },
    });
    const result = await GET(request, { params: Promise.resolve({ path: ['foo', '..', 'vacancies', 'lnk-1001', 'shortlist'] }) });
    expect(result.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
});
