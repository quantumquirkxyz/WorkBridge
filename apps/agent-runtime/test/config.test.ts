import { describe, expect, it, vi } from "vitest";
import { verificationConfigFromEnv, verifyCredential } from "../src/verification/index.js";
import { jsonResponse } from "./json-response.js";

const trustedResult = {
  verified: true,
  checks: [
    { check: "integrity", result: "success" },
    { check: "proof", result: "success" },
    { check: "issuer", result: "success" },
    { check: "revocation", result: "success" },
  ],
  credential: { credentialSubject: { id: "mailto:candidate@example.com" } },
};

function withEnv(values: Record<string, string | undefined>, run: () => Promise<void> | void) {
  const previous = new Map<string, string | undefined>();
  for (const key of Object.keys(values)) previous.set(key, process.env[key]);
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  const finish = () => {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  };
  try {
    const result = run();
    if (result instanceof Promise) return result.finally(finish);
    finish();
    return result;
  } catch (error) {
    finish();
    throw error;
  }
}

describe("verificationConfigFromEnv", () => {
  it("reads the Certo deployment boundary from the environment", () => {
    const config = verificationConfigFromEnv({
      CERTO_BASE_URL: "https://certo.example",
      CERTO_API_TOKEN: "certo-token",
      ACCREDIBLE_API_TOKEN: "accredible-token",
      CREDLY_API_TOKEN: "credly-token",
    });

    expect(config).toEqual({
      certoBaseUrl: "https://certo.example",
      certoApiToken: "certo-token",
      accredibleApiToken: "accredible-token",
    });
    expect(JSON.stringify(config)).not.toContain("credly-token");
  });

  it("reads process.env when no environment object is passed", () => {
    withEnv(
      {
        CERTO_BASE_URL: "https://certo.example",
        CERTO_API_TOKEN: "from-process-env",
        ACCREDIBLE_API_TOKEN: undefined,
      },
      () => {
        expect(verificationConfigFromEnv()).toMatchObject({
          certoBaseUrl: "https://certo.example",
          certoApiToken: "from-process-env",
          accredibleApiToken: undefined,
        });
      },
    );
  });

  it("treats blank deployment values as unset", () => {
    expect(verificationConfigFromEnv({ CERTO_BASE_URL: "  ", CERTO_API_TOKEN: "" })).toEqual({
      certoBaseUrl: undefined,
      certoApiToken: undefined,
      accredibleApiToken: undefined,
    });
  });

  it("calls the HTTPS Certo deployment from process.env when config is omitted", async () => {
    await withEnv(
      {
        CERTO_BASE_URL: "https://certo.example",
        CERTO_API_TOKEN: "from-process-env",
      },
      async () => {
        const fetchMock = vi.fn(async () => jsonResponse(trustedResult));
        const result = await verifyCredential(
          {
            credentialId: "urn:uuid:env",
            holderId: "candidate@example.com",
            traceId: "trace-env",
          },
          { fetch: fetchMock },
        );

        expect(fetchMock).toHaveBeenCalledWith(
          "https://certo.example/api/credentials/urn%3Auuid%3Aenv/verify",
          expect.objectContaining({
            method: "GET",
            headers: expect.any(Headers),
          }),
        );
        const call = fetchMock.mock.calls[0] as unknown as [string, RequestInit] | undefined;
        expect(new Headers(call?.[1]?.headers).get("authorization")).toBeNull();
        expect(JSON.stringify(call?.[1])).not.toContain("from-process-env");
        expect(JSON.stringify(result)).not.toContain("from-process-env");
        expect(result.provider).toBe("certo");
      },
    );
  });

  it("calls localhost Certo over http and skips any other http host", async () => {
    const localFetch = vi.fn(async () => jsonResponse(trustedResult));
    await verifyCredential(
      {
        credentialId: "urn:uuid:local",
        holderId: "candidate@example.com",
        traceId: "trace-local",
      },
      {
        fetch: localFetch,
        config: { certoBaseUrl: "http://localhost:1337", certoApiToken: "local-token" },
      },
    );
    expect(localFetch).toHaveBeenCalledWith(
      "http://localhost:1337/api/credentials/urn%3Auuid%3Alocal/verify",
      expect.anything(),
    );

    const loopbackFetch = vi.fn(async () => jsonResponse(trustedResult));
    await verifyCredential(
      {
        credentialId: "urn:uuid:loopback",
        holderId: "candidate@example.com",
        traceId: "trace-loopback",
      },
      {
        fetch: loopbackFetch,
        config: { certoBaseUrl: "http://127.0.0.1:1337", certoApiToken: "local-token" },
      },
    );
    const loopbackCall = loopbackFetch.mock.calls[0] as unknown as [string, RequestInit] | undefined;
    expect(String(loopbackCall?.[0])).toBe(
      "http://127.0.0.1:1337/api/credentials/urn%3Auuid%3Aloopback/verify",
    );

    const remoteFetch = vi.fn(async () => jsonResponse(trustedResult));
    await verifyCredential(
      { credentialId: "urn:uuid:remote", traceId: "trace-remote" },
      {
        fetch: remoteFetch,
        config: { certoBaseUrl: "http://example.com", certoApiToken: "remote-token" },
      },
    );
    const remoteUrls = (remoteFetch.mock.calls as unknown as [string][])
      .map((call) => String(call[0]))
      .join(" ");
    expect(remoteUrls).not.toContain("example.com");
  });

  it("does not call an http Certo URL and does not let process.env override explicit config", async () => {
    await withEnv(
      {
        CERTO_BASE_URL: "https://live.example",
        CERTO_API_TOKEN: "live-token",
      },
      async () => {
        const httpFetch = vi.fn();
        await verifyCredential(
          { credentialId: "urn:uuid:ignored", traceId: "trace-env" },
          {
            fetch: httpFetch,
            config: { certoBaseUrl: "http://certo.example", certoApiToken: "certo-token" },
          },
        );
        expect(httpFetch.mock.calls.map((call) => String(call[0])).join(" ")).not.toContain(
          "certo.example",
        );
        expect(httpFetch.mock.calls.map((call) => String(call[0])).join(" ")).not.toContain(
          "live.example",
        );

        const emptyFetch = vi.fn();
        await verifyCredential(
          { credentialId: "urn:uuid:empty", traceId: "trace-env" },
          { fetch: emptyFetch, config: {} },
        );
        expect(emptyFetch.mock.calls.map((call) => String(call[0])).join(" ")).not.toContain(
          "live.example",
        );
      },
    );
  });
});
