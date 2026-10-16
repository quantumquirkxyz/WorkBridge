import { createHmac, timingSafeEqual } from "node:crypto";
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

export interface SignedBetterAuthSession extends BetterAuthSession {
  signature: string;
}

/** HMAC over the Better Auth session fields. The client cannot choose a role without this secret. */
export function sessionSignature(
  session: {
    session: { id: string; userId: string; expiresAt: string };
    user: { id: string; email: string; role: string };
  },
  secret: string,
): string {
  const payload = [
    session.session.id,
    session.session.userId,
    session.session.expiresAt,
    session.user.id,
    session.user.email,
    session.user.role,
  ].join("\n");
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function signBetterAuthSession(
  session: BetterAuthSession,
  secret: string,
): SignedBetterAuthSession {
  return { ...session, signature: sessionSignature(session, secret) };
}

const ROLES = new Set<string>(BETTER_AUTH_ROLES);

export function actorFromBetterAuthSession(value: unknown, nowIso: string, secret: string): Actor {
  if (typeof value !== "object" || value === null) {
    throw new ApplicationError("Better Auth session is missing.", 401, "invalid_session");
  }
  const body = value as {
    signature?: unknown;
    session?: { id?: unknown; userId?: unknown; expiresAt?: unknown };
    user?: { id?: unknown; email?: unknown; role?: unknown };
  };
  const sessionId = body.session?.id;
  const userId = body.session?.userId;
  const id = body.user?.id;
  const email = body.user?.email;
  const role = body.user?.role;
  const expiresAt = body.session?.expiresAt;
  if (
    typeof sessionId !== "string" ||
    typeof userId !== "string" ||
    typeof id !== "string" ||
    typeof email !== "string" ||
    typeof role !== "string" ||
    typeof expiresAt !== "string" ||
    userId !== id
  ) {
    throw new ApplicationError(
      "Better Auth session user does not match session.userId.",
      401,
      "invalid_session",
    );
  }
  if (secret.length === 0 || typeof body.signature !== "string") {
    throw new ApplicationError("Better Auth session signature is missing.", 401, "invalid_session");
  }
  const expected = sessionSignature(
    { session: { id: sessionId, userId, expiresAt }, user: { id, email, role } },
    secret,
  );
  const provided = Buffer.from(body.signature);
  const actual = Buffer.from(expected);
  if (provided.length !== actual.length || !timingSafeEqual(provided, actual)) {
    throw new ApplicationError("Better Auth session signature is invalid.", 401, "invalid_session");
  }
  if (Number.isNaN(Date.parse(expiresAt)) || expiresAt <= nowIso) {
    throw new ApplicationError("Better Auth session is expired.", 401, "expired_session");
  }
  if (!ROLES.has(role)) {
    throw new ApplicationError(
      "Better Auth role must be candidate, employer, or counselor.",
      403,
      "unknown_role",
    );
  }
  return { id, role: role as AuthRole };
}
