import { describe, expect, it, vi } from "vitest";
import { verifyCredential } from "../src/verification/index.js";

const TRACE = "trace-fallback-1";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const accredibleCredential = {
  credential: {
    id: "acc-1",
    expired_on: null,
    revoked: false,
    document_integrity: true,
    cryptographic_proof: true,
    recipient: { email: "candidate@example.com" },
    issuer: { name: "Accredible Issuer" },
  },
};

const credlyAssertion = {
  revoked: false,
  document_integrity: true,
  cryptographic_proof: true,
  recipient: { identity: "candidate@example.com", hashed: false, type: "email" },
  badge: { issuer: { name: "Credly Issuer" } },
};

describe("provider fallback chain", () => {
  it("uses Accredible when Certo cannot find the credential", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.startsWith("https://certo.example")) return jsonResponse({ error: "missing" }, 404);
      return jsonResponse(accredibleCredential);
    });

    const result = await verifyCredential(
      {
        credentialId: "acc-1",
        holderId: "candidate@example.com",
        traceId: TRACE,
      },
      {
        fetch: fetchMock,
        config: {
          certoBaseUrl: "https://certo.example",
          certoApiToken: "certo-token",
          accredibleApiToken: "accredible-token",
        },
      },
    );

    const urls = fetchMock.mock.calls.map((call) => String(call[0]));
    expect(urls.some((url) => url.includes("certo.example"))).toBe(true);
    expect(urls).toContain("https://api.accredible.com/v1/credentials/acc-1");
    expect(urls.some((url) => url.includes("credly.com"))).toBe(false);
    const accredibleCall = fetchMock.mock.calls.find((call) =>
      String(call[0]).includes("accredible.com"),
    ) as unknown as [string, RequestInit] | undefined;
    const headers = new Headers(accredibleCall?.[1]?.headers);
    expect(headers.get("authorization")).toBe("Token token=accredible-token");
    expect(result.provider).toBe("accredible");
    expect(result.status).toBe("verified");
    expect(result.externally_verified).toBe(true);
    expect(JSON.stringify(result)).not.toContain("accredible-token");
  });

  it("uses Credly when Certo and Accredible are unavailable", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("credly.com")) return jsonResponse(credlyAssertion);
      throw new Error("provider down");
    });

    const result = await verifyCredential(
      {
        credentialId: "badge-1",
        holderId: "candidate@example.com",
        traceId: TRACE,
      },
      {
        fetch: fetchMock,
        config: {
          certoBaseUrl: "https://certo.example",
          certoApiToken: "certo-token",
          accredibleApiToken: "accredible-token",
          credlyApiToken: "credly-token",
        },
      },
    );

    const urls = fetchMock.mock.calls.map((call) => String(call[0]));
    expect(urls).toContain("https://api.credly.com/v1/obi/v2/badge_assertions/badge-1");
    const credlyCall = fetchMock.mock.calls.find((call) =>
      String(call[0]).includes("credly.com"),
    ) as unknown as [string, RequestInit] | undefined;
    const headers = new Headers(credlyCall?.[1]?.headers);
    expect(headers.get("authorization")).toBeNull();
    expect(result.provider).toBe("credly");
    expect(result.status).toBe("verified");
    expect(result.externally_verified).toBe(true);
    expect(result.fallback_reason).toContain("certo");
    expect(JSON.stringify(result)).not.toContain("credly-token");
  });

  it("does not consult later providers after Certo rejects the credential", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        verified: false,
        checks: [
          { check: "integrity", result: "success" },
          { check: "proof", result: "success" },
          { check: "revocation", result: "error" },
        ],
        credential: { credentialSubject: { id: "mailto:candidate@example.com" } },
      }),
    );

    const result = await verifyCredential(
      {
        credentialId: "revoked-1",
        holderId: "candidate@example.com",
        traceId: TRACE,
      },
      {
        fetch: fetchMock,
        config: {
          certoBaseUrl: "https://certo.example",
          certoApiToken: "certo-token",
          accredibleApiToken: "accredible-token",
          credlyApiToken: "credly-token",
        },
      },
    );

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(result.provider).toBe("certo");
    expect(result.status).toBe("rejected");
  });

  it("uses the mock only after every configured provider is unavailable", async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error("down");
    });

    const result = await verifyCredential(
      { credentialId: "fixture-missing-key", traceId: TRACE },
      {
        fetch: fetchMock,
        config: {
          certoBaseUrl: "https://certo.example",
          certoApiToken: "certo-token",
          accredibleApiToken: "accredible-token",
          credlyApiToken: "credly-token",
        },
      },
    );

    const hosts = (fetchMock.mock.calls as unknown as [string][]).map(
      (call) => new URL(call[0]).host,
    );
    expect(hosts).toEqual(
      expect.arrayContaining(["certo.example", "api.accredible.com", "api.credly.com"]),
    );
    expect(result.provider).toBe("mock");
    expect(result.externally_verified).toBe(false);
    expect(result.status).toBe("unverified");
  });

  it("does not call Accredible when its token is missing", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("credly.com")) return jsonResponse(credlyAssertion);
      if (url.includes("certo.example")) return jsonResponse({ error: "missing" }, 404);
      throw new Error("accredible should not be called");
    });

    const result = await verifyCredential(
      {
        credentialId: "badge-1",
        holderId: "candidate@example.com",
        traceId: TRACE,
      },
      {
        fetch: fetchMock,
        config: { certoBaseUrl: "https://certo.example", certoApiToken: "certo-token" },
      },
    );

    const urls = fetchMock.mock.calls.map((call) => String(call[0]));
    expect(urls.some((url) => url.includes("accredible.com"))).toBe(false);
    expect(result.provider).toBe("credly");
    expect(result.fallback_reason).toContain("accredible_unavailable");
  });

  it("does not verify an Accredible payload that omits revocation and proof", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("certo.example")) return jsonResponse({ error: "missing" }, 404);
      return jsonResponse({
        credential: {
          recipient: { email: "candidate@example.com" },
          issuer: { name: "Accredible Issuer" },
        },
      });
    });

    const result = await verifyCredential(
      {
        credentialId: "acc-sparse",
        holderId: "candidate@example.com",
        traceId: TRACE,
      },
      {
        fetch: fetchMock,
        config: {
          certoBaseUrl: "https://certo.example",
          certoApiToken: "certo-token",
          accredibleApiToken: "accredible-token",
        },
      },
    );

    expect(result.provider).toBe("accredible");
    expect(result.status).not.toBe("verified");
  });
});
