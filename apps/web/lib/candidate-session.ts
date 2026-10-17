import { makeCandidateId } from '@puente/domain';

export interface CandidateSession {
  user?: { id?: unknown; candidateId?: unknown };
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
    const session = JSON.parse(raw) as CandidateSession;
    const candidate = session.user?.candidateId;
    const userId = session.user?.id ?? session.session?.userId;
    if (typeof candidate === 'string' && candidate.length > 0) return candidate;
    if (typeof userId !== 'string' || userId.length === 0) return undefined;
    return userId.startsWith('candidate_') ? userId : makeCandidateId(userId);
  } catch {
    return undefined;
  }
}

export function unauthorized(): Response {
  return Response.json({ error: 'unauthorized' }, { status: 401 });
}
