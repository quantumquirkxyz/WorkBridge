import { accredibleEvidence, parseAccredibleCredential, signalsFromAccredible } from "./accredible.js";
import { evidenceFromCerto, parseCertoVerifyResult, signalsFromCerto } from "./certo-mapper.js";
import { createCircuitBreaker, type CircuitBreaker } from "./circuit-breaker.js";
import { credlyEvidence, parseCredlyAssertion, signalsFromCredly } from "./credly.js";
import { fetchJsonWithRetry, traceHeaders } from "./http.js";
import { mockSignalsFor } from "./mock-fixtures.js";
import { normalizeVerification, type CredentialVerification } from "./status.js";

export interface CredentialInput {
  credentialId?: string;
  document?: Record<string, unknown>;
  holderId?: string;
  declaredOnly?: boolean;
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

type ProviderAttempt =
  | { kind: "result"; verification: CredentialVerification }
  | { kind: "unavailable"; reason: string; outage: boolean }
  | { kind: "skipped" };

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
  if (input.declaredOnly) {
    return normalizeVerification({
      signals: {
        documentIntegrity: null,
        cryptographicProof: null,
        issuerTrust: null,
        revocationStatus: "unknown",
        holderBinding: "unknown",
        declaredOnly: true,
      },
      provider: "mock",
      evidence: [],
    });
  }

  const breaker = breakerFor(deps);
  const reasons: string[] = [];

  for (const provider of ["certo", "accredible", "credly"] as const) {
    const attempt = await attemptProvider(provider, input, deps, breaker);
    if (attempt.kind === "result") {
      if (reasons.length === 0) return attempt.verification;
      return { ...attempt.verification, fallback_reason: reasons.join(",") };
    }
    if (attempt.kind === "unavailable") {
      reasons.push(attempt.reason);
      if (attempt.reason.endsWith("_circuit_open")) continue;
      if (attempt.outage) breaker.recordFailure(provider);
      else breaker.recordSuccess(provider);
    }
  }

  return normalizeVerification({
    signals: mockSignalsFor(input.credentialId, input.holderId),
    provider: "mock",
    fallbackReason: reasons.join(",") || "providers_unavailable",
    evidence: [
      {
        check: "external_verification",
        result: "skipped",
        message: reasons.join(",") || "providers_unavailable",
      },
    ],
  });
}

async function attemptProvider(
  provider: "certo" | "accredible" | "credly",
  input: CredentialInput,
  deps: VerifyDeps,
  breaker: CircuitBreaker,
): Promise<ProviderAttempt> {
  if (breaker.isOpen(provider)) {
    return { kind: "unavailable", reason: `${provider}_circuit_open`, outage: false };
  }
  if (provider === "certo") return queryCerto(input, deps);
  if (!input.credentialId) return { kind: "skipped" };
  if (provider === "accredible") return queryAccredible(input, deps);
  return queryCredly(input, deps);
}

async function queryCerto(input: CredentialInput, deps: VerifyDeps): Promise<ProviderAttempt> {
  const baseUrl = deps.config.certoBaseUrl?.replace(/\/$/, "");
  if (!baseUrl || !deps.config.certoApiToken) {
    return { kind: "unavailable", reason: "certo_unavailable", outage: false };
  }
  if (!input.credentialId && !input.document) {
    return { kind: "unavailable", reason: "certo_not_found", outage: false };
  }

  const response = await fetchJsonWithRetry(
    deps.fetch,
    "certo",
    certoUrl(baseUrl, input),
    {
      method: input.document ? "POST" : "GET",
      headers: certoHeaders(deps, input.traceId, Boolean(input.document)),
      body: input.document ? JSON.stringify({ credential: input.document }) : undefined,
    },
    deps.config.timeoutMs,
  );
  if (response.kind === "unavailable") return response;

  const parsed = parseCertoVerifyResult(response.body);
  if (!parsed) return { kind: "unavailable", reason: "certo_invalid_response", outage: false };
  return {
    kind: "result",
    verification: normalizeVerification({
      signals: signalsFromCerto(parsed, input.holderId),
      provider: "certo",
      evidence: evidenceFromCerto(parsed, deps.config.certoApiToken),
    }),
  };
}

async function queryAccredible(input: CredentialInput, deps: VerifyDeps): Promise<ProviderAttempt> {
  if (!input.credentialId) return { kind: "skipped" };
  const token = deps.config.accredibleApiToken;
  if (!token) return { kind: "unavailable", reason: "accredible_unavailable", outage: false };
  const response = await fetchJsonWithRetry(
    deps.fetch,
    "accredible",
    `https://api.accredible.com/v1/credentials/${encodeURIComponent(input.credentialId)}`,
    {
      method: "GET",
      headers: traceHeaders(input.traceId, { name: "authorization", value: `Token token=${token}` }),
    },
    deps.config.timeoutMs,
  );
  if (response.kind === "unavailable") return response;
  const parsed = parseAccredibleCredential(response.body);
  if (!parsed) return { kind: "unavailable", reason: "accredible_invalid_response", outage: false };
  return {
    kind: "result",
    verification: normalizeVerification({
      signals: signalsFromAccredible(parsed, input.holderId),
      provider: "accredible",
      evidence: accredibleEvidence(),
    }),
  };
}

async function queryCredly(input: CredentialInput, deps: VerifyDeps): Promise<ProviderAttempt> {
  if (!input.credentialId) return { kind: "skipped" };
  const response = await fetchJsonWithRetry(
    deps.fetch,
    "credly",
    `https://api.credly.com/v1/obi/v2/badge_assertions/${encodeURIComponent(input.credentialId)}`,
    {
      method: "GET",
      headers: traceHeaders(input.traceId),
    },
    deps.config.timeoutMs,
  );
  if (response.kind === "unavailable") return response;
  const parsed = parseCredlyAssertion(response.body);
  if (!parsed) return { kind: "unavailable", reason: "credly_invalid_response", outage: false };
  return {
    kind: "result",
    verification: normalizeVerification({
      signals: signalsFromCredly(parsed, input.holderId),
      provider: "credly",
      evidence: credlyEvidence(),
    }),
  };
}

function certoUrl(baseUrl: string, input: CredentialInput): string {
  if (input.document) return `${baseUrl}/api/credentials/validate`;
  return `${baseUrl}/api/credentials/${encodeURIComponent(input.credentialId ?? "")}/verify`;
}

function certoHeaders(deps: VerifyDeps, traceId: string, jsonBody: boolean): Headers {
  const headers = traceHeaders(
    traceId,
    deps.config.certoApiToken
      ? { name: "authorization", value: `Bearer ${deps.config.certoApiToken}` }
      : undefined,
  );
  if (jsonBody) headers.set("content-type", "application/json");
  return headers;
}
