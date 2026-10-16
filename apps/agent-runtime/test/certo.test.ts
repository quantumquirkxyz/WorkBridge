import { describe, expect, it, vi } from "vitest";
import { verifyCredential } from "../src/verification/index.js";

const TOKEN = "certo-token-secret";
const TRACE = "trace-certo-1";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const trustedResult = {
  verified: true,
  checks: [
    { check: "integrity", result: "success" },
    { check: "proof", result: "success" },
    { check: "issuer", result: "success" },
    { check: "revocation", result: "success" },
    { check: "expiration", result: "success" },
  ],
  credential: {
    credentialSubject: { id: "mailto:candidate@example.com" },
  },
};

describe("CertoVerifier", () => {
  it("verifies a credential id against the separate Certo deployment", async () => {
    const fetchMock = vi.fn(async () => jsonResponse(trustedResult));

    const result = await verifyCredential(
      {
        credentialId: "urn:uuid:valid",
        holderId: "candidate@example.com",
        traceId: TRACE,
      },
      {
        fetch: fetchMock,
        config: {
          certoBaseUrl: "https://certo.example",
          certoApiToken: TOKEN,
        },
      },
    );

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(
      "https://certo.example/api/credentials/urn%3Auuid%3Avalid/verify",
    );
    expect(new Headers(init.headers).get("authorization")).toBe(`Bearer ${TOKEN}`);
    expect(new Headers(init.headers).get("x-trace-id")).toBe(TRACE);
    expect(result.status).toBe("verified");
    expect(result.provider).toBe("certo");
    expect(result.externally_verified).toBe(true);
    expect(JSON.stringify(result)).not.toContain(TOKEN);
  });

  it("posts an external document to the Certo validate route", async () => {
    const fetchMock = vi.fn(async () => jsonResponse(trustedResult));
    const document = { id: "urn:uuid:doc", type: ["VerifiableCredential"] };

    await verifyCredential(
      {
        document,
        holderId: "candidate@example.com",
        traceId: TRACE,
      },
      {
        fetch: fetchMock,
        config: { certoBaseUrl: "https://certo.example", certoApiToken: TOKEN },
      },
    );

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://certo.example/api/credentials/validate");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({ credential: document });
  });

  it("retries one idempotent failure and then accepts the Certo result", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ error: "unavailable" }, 503))
      .mockResolvedValueOnce(jsonResponse(trustedResult));

    const result = await verifyCredential(
      {
        credentialId: "urn:uuid:retry",
        holderId: "candidate@example.com",
        traceId: TRACE,
      },
      {
        fetch: fetchMock,
        config: { certoBaseUrl: "https://certo.example", certoApiToken: TOKEN },
      },
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.provider).toBe("certo");
    expect(result.status).toBe("verified");
  });

  it("keeps a rejected Certo result instead of falling back", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        verified: false,
        checks: [
          { check: "proof", result: "success" },
          { check: "integrity", result: "success" },
          { check: "revocation", result: "error", message: `revoked ${TOKEN}` },
        ],
        credential: { credentialSubject: { id: "mailto:candidate@example.com" } },
      }),
    );

    const result = await verifyCredential(
      {
        credentialId: "urn:uuid:revoked",
        holderId: "candidate@example.com",
        traceId: TRACE,
      },
      {
        fetch: fetchMock,
        config: { certoBaseUrl: "https://certo.example", certoApiToken: TOKEN },
      },
    );

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(result.provider).toBe("certo");
    expect(result.status).toBe("rejected");
    expect(result.externally_verified).toBe(true);
    expect(JSON.stringify(result)).not.toContain(TOKEN);
  });

  it("uses a deterministic mock when Certo cannot be reached", async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error(`network down ${TOKEN}`);
    });

    const result = await verifyCredential(
      {
        credentialId: "fixture-valid",
        holderId: "candidate@example.com",
        traceId: TRACE,
      },
      {
        fetch: fetchMock,
        config: { certoBaseUrl: "https://certo.example", certoApiToken: TOKEN },
      },
    );

    expect(result.provider).toBe("mock");
    expect(result.externally_verified).toBe(false);
    expect(result.status).toBe("verified");
    expect(result.fallback_reason).toContain("certo");
    expect(JSON.stringify(result)).not.toContain(TOKEN);
  });

  it("does not call Certo when the deployment URL is missing", async () => {
    const fetchMock = vi.fn();

    const result = await verifyCredential(
      { credentialId: "fixture-missing-key", traceId: TRACE },
      { fetch: fetchMock, config: {} },
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.provider).toBe("mock");
    expect(result.externally_verified).toBe(false);
    expect(result.status).toBe("unverified");
  });

  it("opens the circuit after repeated Certo failures", async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error("down");
    });
    const deps = {
      fetch: fetchMock,
      config: { certoBaseUrl: "https://certo.example", certoApiToken: TOKEN },
    };

    await verifyCredential({ credentialId: "a", traceId: TRACE }, deps);
    await verifyCredential({ credentialId: "b", traceId: TRACE }, deps);
    await verifyCredential({ credentialId: "c", traceId: TRACE }, deps);
    const callsAfterFailures = fetchMock.mock.calls.length;
    await verifyCredential({ credentialId: "d", traceId: TRACE }, deps);

    expect(fetchMock.mock.calls.length).toBe(callsAfterFailures);
  });
});
