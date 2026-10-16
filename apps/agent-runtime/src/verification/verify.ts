import { evidenceFromCerto, parseCertoVerifyResult, signalsFromCerto } from "./certo-mapper.js";
import { createCircuitBreaker, type CircuitBreaker } from "./circuit-breaker.js";
import { mockSignalsFor } from "./mock-fixtures.js";
import { normalizeVerification, type CredentialVerification } from "./status.js";

export interface CredentialInput {
  credentialId?: string;
  document?: Record<string, unknown>;
  holderId?: string;
  traceId: string;
}

export interface VerifierConfig {
  certoBaseUrl?: string;
  certoApiToken?: string;
  accredibleApiToken?: string;
  credlyApiToken?: string;
  timeoutMs?: number;
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface VerifyDeps {
  fetch: FetchLike;
  config: VerifierConfig;
  circuitBreaker?: CircuitBreaker;
}

const DEFAULT_TIMEOUT_MS = 5_000;
const breakers = new WeakMap<VerifyDeps, CircuitBreaker>();

function breakerFor(deps: VerifyDeps): CircuitBreaker {
  if (deps.circuitBreaker) return deps.circuitBreaker;
  const existing = breakers.get(deps);
  if (existing) return existing;
  const created = createCircuitBreaker();
  breakers.set(deps, created);
  return created;
}

export async function verifyCredential(
  input: CredentialInput,
  deps: VerifyDeps,
): Promise<CredentialVerification> {
  const baseUrl = deps.config.certoBaseUrl?.replace(/\/$/, "");
  const breaker = breakerFor(deps);
  if (!baseUrl || breaker?.isOpen("certo")) {
    return mockResult(
      input,
      breaker?.isOpen("certo") ? "certo_circuit_open" : "certo_unavailable",
    );
  }

  const outcome = await queryCerto(input, deps, baseUrl);
  if (outcome.kind === "unavailable") {
    breaker?.recordFailure("certo");
    return mockResult(input, outcome.reason);
  }
  breaker?.recordSuccess("certo");
  return outcome.verification;
}

async function queryCerto(
  input: CredentialInput,
  deps: VerifyDeps,
  baseUrl: string,
): Promise<
  | { kind: "result"; verification: CredentialVerification }
  | { kind: "unavailable"; reason: string }
> {
  if (!input.credentialId && !input.document) {
    return { kind: "unavailable", reason: "certo_not_found" };
  }

  const timeoutMs = deps.config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  let lastReason = "certo_unavailable";

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await deps.fetch(certoUrl(baseUrl, input), {
        method: input.document ? "POST" : "GET",
        headers: certoHeaders(deps, input.traceId, Boolean(input.document)),
        body: input.document ? JSON.stringify({ credential: input.document }) : undefined,
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (response.status === 404) return { kind: "unavailable", reason: "certo_not_found" };
      if (response.status >= 500) {
        lastReason = "certo_unavailable";
        continue;
      }
      if (!response.ok) return { kind: "unavailable", reason: "certo_unavailable" };

      const parsed = parseCertoVerifyResult(await response.json());
      if (!parsed) return { kind: "unavailable", reason: "certo_invalid_response" };

      return {
        kind: "result",
        verification: normalizeVerification({
          signals: signalsFromCerto(parsed, input.holderId),
          provider: "certo",
          evidence: evidenceFromCerto(parsed, deps.config.certoApiToken),
        }),
      };
    } catch {
      lastReason = "certo_unavailable";
    }
  }

  return { kind: "unavailable", reason: lastReason };
}

function certoUrl(baseUrl: string, input: CredentialInput): string {
  if (input.document) return `${baseUrl}/api/credentials/validate`;
  return `${baseUrl}/api/credentials/${encodeURIComponent(input.credentialId ?? "")}/verify`;
}

function certoHeaders(deps: VerifyDeps, traceId: string, jsonBody: boolean): Headers {
  const headers = new Headers({ accept: "application/json", "x-trace-id": traceId });
  if (jsonBody) headers.set("content-type", "application/json");
  const token = deps.config.certoApiToken;
  if (token) headers.set("authorization", `Bearer ${token}`);
  return headers;
}

function mockResult(input: CredentialInput, reason: string): CredentialVerification {
  return normalizeVerification({
    signals: mockSignalsFor(input.credentialId),
    provider: "mock",
    fallbackReason: reason,
    evidence: [{ check: "external_verification", result: "skipped", message: reason }],
  });
}
