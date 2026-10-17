import { describe, expect, it } from "vitest";
import { actorFromBetterAuthSession, sessionSignature, type BetterAuthSession } from "../roles";

const SECRET = "better-auth-test-secret";

function signed(session: BetterAuthSession) {
  return { ...session, signature: sessionSignature(session, SECRET) };
}

function candidate(expiresAt: string): BetterAuthSession {
  return {
    session: { id: "s", userId: "candidate", expiresAt },
    user: { id: "candidate", email: "a@puente.pa", role: "candidate" },
  };
}

describe("actorFromBetterAuthSession expiry", () => {
  it("accepts a live session whose expiry uses a timezone offset", () => {
    // 2026-10-17T04:30:00-05:00 is 2026-10-17T09:30:00Z, after `now`.
    const now = "2026-10-17T09:00:00.000Z";
    expect(actorFromBetterAuthSession(signed(candidate("2026-10-17T04:30:00-05:00")), now, SECRET)).toEqual({
      id: "candidate",
      role: "candidate",
      employerOrgId: undefined,
    });
  });

  it("rejects an expiry that is not in the future though it sorts after now lexicographically", () => {
    const now = "2026-10-17T09:00:00.000Z";
    // Same instant as `now`, but "2026-10-17T09:00:00Z" > "2026-10-17T09:00:00.000Z" as strings.
    expect(() => actorFromBetterAuthSession(signed(candidate("2026-10-17T09:00:00Z")), now, SECRET)).toThrow(/expired/);
  });
});
