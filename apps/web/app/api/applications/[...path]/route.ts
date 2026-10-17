import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { signBetterAuthSession, type BetterAuthSession } from '@workbridge/agent-runtime';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ path?: string[] }> };

async function handler(request: Request, context: RouteContext): Promise<Response> {
  const runtimeUrl = process.env.AGENT_RUNTIME_URL;
  const secret = process.env.BETTER_AUTH_SESSION_SECRET ?? process.env.BETTER_AUTH_SECRET;
  if (!runtimeUrl || !secret) {
    return NextResponse.json({ error: 'application_runtime_unavailable' }, { status: 503 });
  }

  const { path } = await context.params;
  // URL normalization would turn dot segments into a different runtime route than the one authenticated below.
  if ((path ?? []).some((segment) => segment === '.' || segment === '..')) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }
  const isShortlist = path?.length === 3 && path[0] === 'vacancies' && path[2] === 'shortlist';
  let session = readSession(request);
  if (isShortlist) {
    // Ranking is employer-only and uses the real cookie session, never a caller-supplied role header.
    const { getServerSession } = await import('../../../../lib/auth');
    const authenticated = await getServerSession();
    if (!authenticated) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
    if (authenticated.user.role !== 'employer') return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    session = {
      session: {
        id: authenticated.session.id,
        userId: authenticated.user.id,
        expiresAt: new Date(authenticated.session.expiresAt).toISOString(),
      },
      user: {
        id: authenticated.user.id, email: authenticated.user.email, role: 'employer',
        employerOrgId: authenticated.user.employerOrgId ?? undefined,
      },
    };
  }
  if (!session) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const signedSession = signBetterAuthSession(session, secret);
  const incoming = new URL(request.url);
  const target = new URL(`${runtimeUrl.replace(/\/$/, '')}/${(path ?? []).map(encodeURIComponent).join('/')}`);
  incoming.searchParams.forEach((value, key) => target.searchParams.set(key, value));

  const traceId = request.headers.get('x-trace-id') ?? randomUUID();
  const headers = new Headers();
  headers.set('accept', request.headers.get('accept') ?? 'application/json');
  headers.set('x-better-auth-session', JSON.stringify(signedSession));
  const idempotencyKey = request.headers.get('idempotency-key');
  if (idempotencyKey) headers.set('idempotency-key', idempotencyKey);

  let body: string | undefined;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const text = await request.text();
    const payload: unknown = text ? JSON.parse(text) : {};
    if (typeof payload === 'object' && payload !== null && !Array.isArray(payload)) {
      const object = payload as Record<string, unknown>;
      if (object.traceId === undefined) object.traceId = traceId;
      if (idempotencyKey && object.idempotencyKey === undefined) object.idempotencyKey = idempotencyKey;
      body = JSON.stringify(object);
      headers.set('content-type', 'application/json');
    } else {
      body = text;
    }
  } else if (!target.searchParams.has('traceId')) {
    target.searchParams.set('traceId', traceId);
  }

  const response = await fetch(target, { method: request.method, headers, body });
  return new Response(response.body, {
    status: response.status,
    headers: { 'content-type': response.headers.get('content-type') ?? 'application/json' },
  });
}

function readSession(request: Request): BetterAuthSession | undefined {
  const raw = request.headers.get('x-better-auth-session') ?? readCookie(request, 'better-auth-session');
  if (!raw) return undefined;
  try {
    const value = JSON.parse(raw) as BetterAuthSession;
    if (!value.session || !value.user || typeof value.session.id !== 'string' || typeof value.user.id !== 'string') {
      return undefined;
    }
    return value;
  } catch {
    return undefined;
  }
}

function readCookie(request: Request, name: string): string | undefined {
  const cookie = request.headers.get('cookie');
  const value = cookie?.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return value ? decodeURIComponent(value.slice(name.length + 1)) : undefined;
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
