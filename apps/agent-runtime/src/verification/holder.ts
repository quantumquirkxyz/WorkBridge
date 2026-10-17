import type { HolderBinding } from "./status";

export function normalizeHolderId(value: string): string {
  return value.trim().toLowerCase().replace(/^mailto:/, "");
}

export function holderBindingFor(
  credential: unknown,
  holderId: string | undefined,
): HolderBinding {
  if (!holderId) return "unknown";
  const subject = readSubject(credential);
  if (!subject) return "unknown";
  return normalizeHolderId(subject) === normalizeHolderId(holderId)
    ? "bound"
    : "unbound";
}

function readSubject(credential: unknown): string | undefined {
  const paths = [
    ["credentialSubject", "id"],
    ["credentialSubject", "email"],
    ["recipient", "email"],
  ];
  for (const path of paths) {
    const value = readPath(credential, path);
    if (typeof value === "string" && value.trim() !== "") return value;
  }
  return undefined;
}

function readPath(value: unknown, path: string[]): unknown {
  let current = value;
  for (const key of path) {
    if (!current || typeof current !== "object" || !(key in current)) return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}
