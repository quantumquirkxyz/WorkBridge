import { actorFromBetterAuthSession } from '@workbridge/agent-runtime';
import { makeCandidateId } from '@workbridge/domain';
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
function actorFromHeader(request: Request) {
  const raw = request.headers.get('x-better-auth-session');
  if (!raw) return undefined;
  try {
    const session = JSON.parse(raw);
    return actorFromBetterAuthSession(session, new Date().toISOString(), process.env.BETTER_AUTH_SECRET ?? '');
  } catch {
    return undefined;
  }
}

export function candidateIdFromRequest(request: Request): string | undefined {
  const actor = actorFromHeader(request);
  return actor?.role === 'candidate' ? makeCandidateId(actor.id) : undefined;
}

/** Raw Better Auth user id. Profile normalization hashes this once into makeCandidateId. */
export function candidateUserIdFromRequest(request: Request): string | undefined {
  const actor = actorFromHeader(request);
  return actor?.role === 'candidate' ? actor.id : undefined;
}

/** Resolve browser requests from the Better Auth cookie, while retaining the signed-header seam for tests/BFF calls. */
export async function candidateIdFromRequestOrSession(request: Request): Promise<string | undefined> {
  const userId = await candidateUserIdFromRequestOrSession(request);
  return userId ? makeCandidateId(userId) : undefined;
}

/** The session user id, before makeCandidateId. Intake uses this as the profile seed. */
export async function candidateUserIdFromRequestOrSession(request: Request): Promise<string | undefined> {
  try {
    const session = await getServerSession();
    if (session?.user.role === 'candidate' && session.user.id) return session.user.id;
    if (session?.user.role && session.user.role !== 'candidate') return undefined;
  } catch {
    // Test-only header fallback below preserves the route seam without trusting it in production.
  }
  return process.env.NODE_ENV === 'test' ? candidateUserIdFromRequest(request) : undefined;
}

export function unauthorized(): Response {
  return Response.json({ error: 'unauthorized' }, { status: 401 });
}
