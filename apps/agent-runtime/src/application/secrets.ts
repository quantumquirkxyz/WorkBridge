import { ApplicationError } from "./errors";

/** Names that must never be copied into a draft, audit event, or HTTP body. */
export const SECRET_ENV_NAMES = [
  "CERTO_TOKEN",
  "OPENROUTER_API_KEY",
  "GOOGLE_MAPS_API_KEY",
  "ACCREDIBLE_API_KEY",
  "CREDLY_API_KEY",
  "DATABASE_URL",
  "NEON_DATABASE_URL",
  "BETTER_AUTH_SECRET",
] as const;

export function collectSecretValues(env: Record<string, string | undefined>): string[] {
  const values: string[] = [];
  for (const name of SECRET_ENV_NAMES) {
    const value = env[name];
    if (typeof value === "string" && value.length > 0) values.push(value);
  }
  return values;
}

export function assertNoSecrets(value: unknown, secrets: readonly string[]): void {
  const text = JSON.stringify(value) ?? "";
  for (const secret of secrets) {
    if (text.includes(secret)) {
      throw new ApplicationError(
        "A secret was rejected and was not stored.",
        422,
        "secret_rejected",
      );
    }
  }
}
