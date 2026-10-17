import { describe, expect, it, vi } from "vitest";
import {
  confusionMatrix,
  mandatoryCredentialSatisfied,
  validateCredentialVerification,
  verifyCredential,
  type CredentialVerification,
  type VerificationStatus,
} from "../src/verification/index.js";
import { jsonResponse } from "./json-response.js";

const HOLDER = "candidate@example.com";
const TRACE = "trace-ground-truth";

function certo(checks: Array<{ check: string; result: "success" | "error" | "warning"; message?: string }>, verified: boolean) {
  return jsonResponse({
    verified,
    checks,
    credential: { credentialSubject: { id: `mailto:${HOLDER}` } },
  });
}

const passingChecks = [
  { check: "integrity", result: "success" as const },
  { check: "proof", result: "success" as const },
  { check: "issuer", result: "success" as const },
  { check: "revocation", result: "success" as const },
  { check: "expiration", result: "success" as const },
];

interface GroundTruthCase {
  id: number;
  name: string;
  groundTruth: VerificationStatus;
  provider: CredentialVerification["provider"];
  externallyVerified: boolean;
  credentialId: string;
  declaredOnly?: boolean;
  holderId?: string;
  fetchImpl: (url: string) => Response | Promise<Response>;
}

const cases: GroundTruthCase[] = [
  {
    id: 1,
    name: "valid signature and trusted issuer",
    groundTruth: "verified",
    provider: "certo",
    externallyVerified: true,
    credentialId: "case-01",
    holderId: HOLDER,
    fetchImpl: () => certo(passingChecks, true),
  },
  {
    id: 2,
    name: "valid signature with revoked certificate",
    groundTruth: "rejected",
    provider: "certo",
    externallyVerified: true,
    credentialId: "case-02",
    holderId: HOLDER,
    fetchImpl: () =>
      certo(
        [
          { check: "integrity", result: "success" },
          { check: "proof", result: "success" },
          { check: "revocation", result: "error", message: "revoked" },
        ],
        false,
      ),
  },
  {
    id: 3,
    name: "expired certificate",
    groundTruth: "rejected",
    provider: "certo",
    externallyVerified: true,
    credentialId: "case-03",
    holderId: HOLDER,
    fetchImpl: () =>
      certo(
        [
          { check: "integrity", result: "success" },
          { check: "proof", result: "success" },
          { check: "expiration", result: "error", message: "expired" },
        ],
        false,
      ),
  },
  {
    id: 4,
    name: "altered document",
    groundTruth: "rejected",
    provider: "certo",
    externallyVerified: true,
    credentialId: "case-04",
    holderId: HOLDER,
    fetchImpl: () => certo([{ check: "integrity", result: "error", message: "tampered" }], false),
  },
  {
    id: 5,
    name: "invalid signature",
    groundTruth: "rejected",
    provider: "certo",
    externallyVerified: true,
    credentialId: "case-05",
    holderId: HOLDER,
    fetchImpl: () => certo([{ check: "proof", result: "error", message: "bad signature" }], false),
  },
  {
    id: 6,
    name: "unknown signer",
    groundTruth: "unverified",
    provider: "certo",
    externallyVerified: true,
    credentialId: "case-06",
    holderId: HOLDER,
    fetchImpl: () =>
      certo(
        [
          { check: "integrity", result: "success" },
          { check: "proof", result: "success" },
          { check: "signer", result: "error", message: "unknown signer" },
        ],
        false,
      ),
  },
  {
    id: 7,
    name: "inconsistent issuer identity",
    groundTruth: "rejected",
    provider: "certo",
    externallyVerified: true,
    credentialId: "case-07",
    holderId: HOLDER,
    fetchImpl: () =>
      certo(
        [{ check: "issuer_identity", result: "error", message: "inconsistent issuer" }],
        false,
      ),
  },
  {
    id: 8,
    name: "inconsistent certificate data",
    groundTruth: "rejected",
    provider: "certo",
    externallyVerified: true,
    credentialId: "case-08",
    holderId: HOLDER,
    fetchImpl: () =>
      certo(
        [{ check: "certificate_data", result: "error", message: "inconsistent fields" }],
        false,
      ),
  },
  {
    id: 9,
    name: "missing public key",
    groundTruth: "unverified",
    provider: "certo",
    externallyVerified: true,
    credentialId: "case-09",
    holderId: HOLDER,
    fetchImpl: () =>
      certo([{ check: "proof", result: "warning", message: "public key missing" }], false),
  },
  {
    id: 10,
    name: "unsupported format",
    groundTruth: "unverified",
    provider: "certo",
    externallyVerified: true,
    credentialId: "case-10",
    holderId: HOLDER,
    fetchImpl: () => certo([{ check: "format", result: "error", message: "unsupported" }], false),
  },
  {
    id: 11,
    name: "Certo unavailable with Accredible fallback",
    groundTruth: "verified",
    provider: "accredible",
    externallyVerified: true,
    credentialId: "case-11",
    holderId: HOLDER,
    fetchImpl: (url) => {
      if (url.includes("accredible.com")) {
        return jsonResponse({
          credential: {
            recipient: { email: HOLDER },
            issuer: { name: "Accredible Issuer" },
            revoked: false,
            document_integrity: true,
            cryptographic_proof: true,
          },
        });
      }
      throw new Error("certo down");
    },
  },
  {
    id: 12,
    name: "Accredible unavailable with Credly fallback",
    groundTruth: "verified",
    provider: "credly",
    externallyVerified: true,
    credentialId: "case-12",
    holderId: HOLDER,
    fetchImpl: (url) => {
      if (url.includes("credly.com")) {
        return jsonResponse({
          revoked: false,
          document_integrity: true,
          cryptographic_proof: true,
          recipient: { identity: HOLDER, hashed: false },
          badge: { issuer: { name: "Credly Issuer" } },
        });
      }
      throw new Error("provider down");
    },
  },
  {
    id: 13,
    name: "all providers unavailable",
    groundTruth: "rejected",
    provider: "mock",
    externallyVerified: false,
    credentialId: "case-13",
    fetchImpl: () => {
      throw new Error("all down");
    },
  },
  {
    id: 14,
    name: "declared credential without evidence",
    groundTruth: "declared",
    provider: "mock",
    externallyVerified: false,
    credentialId: "case-14",
    declaredOnly: true,
    fetchImpl: () => {
      throw new Error("should not call a provider");
    },
  },
  {
    id: 15,
    name: "duplicate or reused credential",
    groundTruth: "rejected",
    provider: "certo",
    externallyVerified: true,
    credentialId: "case-15",
    holderId: HOLDER,
    fetchImpl: () =>
      certo(
        [
          { check: "integrity", result: "success" },
          { check: "proof", result: "success" },
          { check: "reuse", result: "error", message: "credential reused" },
        ],
        false,
      ),
  },
];

const providerConfig = {
  certoBaseUrl: "https://certo.example",
  certoApiToken: "certo-token",
  accredibleApiToken: "accredible-token",
  credlyApiToken: "credly-token",
};

describe("credential ground truth", () => {
  it("matches all 15 labelled cases and reports the confusion matrix", async () => {
    const rows = [];

    for (const groundTruthCase of cases) {
      const fetchMock = vi.fn(async (url: string) => groundTruthCase.fetchImpl(url));
      const result = await verifyCredential(
        {
          credentialId: groundTruthCase.credentialId,
          holderId: groundTruthCase.holderId,
          declaredOnly: groundTruthCase.declaredOnly,
          traceId: TRACE,
        },
        { fetch: fetchMock, config: providerConfig },
      );

      expect(result.status, groundTruthCase.name).toBe(groundTruthCase.groundTruth);
      expect(result.provider, groundTruthCase.name).toBe(groundTruthCase.provider);
      expect(result.externally_verified, groundTruthCase.name).toBe(
        groundTruthCase.externallyVerified,
      );
      expect(validateCredentialVerification(result), groundTruthCase.name).toEqual([]);
      expect(mandatoryCredentialSatisfied(result), groundTruthCase.name).toBe(
        groundTruthCase.groundTruth === "verified",
      );
      if (groundTruthCase.declaredOnly) expect(fetchMock).not.toHaveBeenCalled();

      rows.push({
        groundTruth: groundTruthCase.groundTruth,
        predicted: result.status,
        usedFallback: Boolean(result.fallback_reason),
      });
    }

    const matrix = confusionMatrix(rows);
    expect(matrix).toMatchObject({
      tp: 3,
      tn: 12,
      fp: 0,
      fn: 0,
      precision: 1,
      recall: 1,
      falsePositiveRate: 0,
      falseNegativeRate: 0,
      fallbackRate: 3 / 15,
    });
  });
});

describe("holder binding", () => {
  it("does not treat a valid credential as verified when the holder does not match", async () => {
    const result = await verifyCredential(
      {
        credentialId: "case-holder",
        holderId: "other@example.com",
        traceId: TRACE,
      },
      {
        fetch: vi.fn(async () => certo(passingChecks, true)),
        config: providerConfig,
      },
    );

    expect(result.status).toBe("rejected");
    expect(result.holder_binding).toBe("unbound");
    expect(mandatoryCredentialSatisfied(result)).toBe(false);
  });
});
