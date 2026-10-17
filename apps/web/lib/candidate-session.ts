import { actorFromBetterAuthSession } from '@puente/agent-runtime';
import { makeCandidateId } from '@puente/domain';
import { getServerSession } from './auth';

export interface CandidateSession {
  user?: { id?: unknown; candidateId?: unknown; role?: unknown };
  session?: { userId?: unknown };
}

/**
 * Resolve the candidate owned by the Better Auth session.  The header is the
 * same signed session representation used by the application runtime and is
 * deliberately the only source of identity for these routes.
 */
export function candidateIdFromRequest(request: Request): string | undefined {
  const raw = request.headers.get('x-better-auth-session');
  if (!raw) return undefined;
  try {
    const session = JSON.parse(raw);
    const actor = actorFromBetterAuthSession(session, new Date().toISOString(), process.env.BETTER_AUTH_SECRET ?? '');
    return actor.role === 'candidate' ? makeCandidateId(actor.id) : undefined;
  } catch {
    return undefined;
  }
}

/** Resolve browser requests from the Better Auth cookie, while retaining the signed-header seam for tests/BFF calls. */
export async function candidateIdFromRequestOrSession(request: Request): Promise<string | undefined> {
  try {
    const session = await getServerSession();
    if (session?.user.role === 'candidate' && session.user.id) return makeCandidateId(session.user.id);
  } catch {
    // Test-only header fallback below preserves the route seam without trusting it in production.
  }
  return process.env.NODE_ENV === 'test' ? candidateIdFromRequest(request) : undefined;
}

export function unauthorized(): Response {
  return Response.json({ error: 'unauthorized' }, { status: 401 });
}
