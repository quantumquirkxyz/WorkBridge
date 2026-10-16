import { ApplicationError } from "./errors";

/** Better Auth `session.user.role` values for Puente Laboral. */
export const BETTER_AUTH_ROLES = ["candidate", "employer", "counselor"] as const;

export type AuthRole = (typeof BETTER_AUTH_ROLES)[number];

export interface BetterAuthSession {
  session: {
    id: string;
    userId: string;
    expiresAt: string;
  };
  user: {
    id: string;
    email: string;
    role: AuthRole;
  };
}

export interface Actor {
  id: string;
  role: AuthRole;
}

const ROLES = new Set<string>(BETTER_AUTH_ROLES);

export function actorFromBetterAuthSession(value: unknown, nowIso: string): Actor {
  if (typeof value !== "object" || value === null) {
    throw new ApplicationError("Better Auth session is missing.", 401, "invalid_session");
  }
  const body = value as {
    session?: { userId?: unknown; expiresAt?: unknown };
    user?: { id?: unknown; role?: unknown };
  };
  const userId = body.session?.userId;
  const id = body.user?.id;
  const role = body.user?.role;
  const expiresAt = body.session?.expiresAt;
  if (typeof userId !== "string" || typeof id !== "string" || userId !== id) {
    throw new ApplicationError(
      "Better Auth session user does not match session.userId.",
      401,
      "invalid_session",
    );
  }
  if (typeof expiresAt !== "string" || Number.isNaN(Date.parse(expiresAt)) || expiresAt <= nowIso) {
    throw new ApplicationError("Better Auth session is expired.", 401, "expired_session");
  }
  if (typeof role !== "string" || !ROLES.has(role)) {
    throw new ApplicationError(
      "Better Auth role must be candidate, employer, or counselor.",
      403,
      "unknown_role",
    );
  }
  return { id, role: role as AuthRole };
}
