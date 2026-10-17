import type { VerifierConfig } from "./verify.js";

export function verificationConfigFromEnv(
  env: Record<string, string | undefined> = process.env,
): VerifierConfig {
  return {
    certoBaseUrl: present(env.CERTO_BASE_URL),
    certoApiToken: present(env.CERTO_API_TOKEN),
    accredibleApiToken: present(env.ACCREDIBLE_API_TOKEN),
  };
}

function present(value: string | undefined): string | undefined {
  if (!value || value.trim() === "") return undefined;
  return value;
}
