import type { RevocationStatus } from "./status";

export function isPast(value: string | null | undefined, now: Date): boolean {
  if (!value) return false;
  const time = Date.parse(value);
  return Number.isFinite(time) && time <= now.getTime();
}

export function optionalBoolean(value: boolean | undefined): boolean | null {
  return typeof value === "boolean" ? value : null;
}

export function revocationFrom(revoked: boolean | undefined): RevocationStatus {
  if (revoked === true) return "revoked";
  if (revoked === false) return "not_revoked";
  return "unknown";
}
