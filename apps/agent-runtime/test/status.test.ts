import { describe, expect, it } from "vitest";
import {
  mandatoryCredentialSatisfied,
  normalizeVerification,
  validateCredentialVerification,
  type VerificationSignals,
} from "../src/verification/index.js";

const trustedBound: VerificationSignals = {
  documentIntegrity: true,
  cryptographicProof: true,
  issuerTrust: true,
  revocationStatus: "not_revoked",
  holderBinding: "bound",
};

describe("CredentialVerification contract", () => {
  it("accepts a normalized verified credential and rejects an unknown status", () => {
    const verification = normalizeVerification({
      signals: trustedBound,
      provider: "certo",
      evidence: [{ check: "proof", result: "success" }],
    });

    expect(validateCredentialVerification(verification)).toEqual([]);
    expect(
      validateCredentialVerification({ ...verification, status: "authentic" }),
    ).not.toEqual([]);
  });

  it("rejects a verified status whose holder is not bound", () => {
    const verification = normalizeVerification({
      signals: trustedBound,
      provider: "certo",
    });

    expect(
      validateCredentialVerification({
        ...verification,
        status: "verified",
        holder_binding: "unbound",
      }),
    ).not.toEqual([]);
  });

  it("marks mock results as not externally verified and live providers as external", () => {
    const mock = normalizeVerification({
      signals: trustedBound,
      provider: "mock",
    });
    const certo = normalizeVerification({
      signals: trustedBound,
      provider: "certo",
    });

    expect(mock.externally_verified).toBe(false);
    expect(certo.externally_verified).toBe(true);
    expect(validateCredentialVerification(mock)).toEqual([]);
    expect(
      validateCredentialVerification({ ...mock, externally_verified: true }),
    ).not.toEqual([]);
  });
});

describe("verification status", () => {
  it("returns verified only when integrity, proof, trust, revocation, and holder binding all pass", () => {
    const verification = normalizeVerification({
      signals: trustedBound,
      provider: "certo",
    });

    expect(verification.status).toBe("verified");
    expect(mandatoryCredentialSatisfied(verification)).toBe(true);
  });

  it("returns rejected when the holder does not match", () => {
    const verification = normalizeVerification({
      signals: { ...trustedBound, holderBinding: "unbound" },
      provider: "certo",
    });

    expect(verification.status).toBe("rejected");
    expect(mandatoryCredentialSatisfied(verification)).toBe(false);
  });

  it("returns unverified when the holder cannot be established", () => {
    const verification = normalizeVerification({
      signals: { ...trustedBound, holderBinding: "unknown" },
      provider: "certo",
    });

    expect(verification.status).toBe("unverified");
    expect(mandatoryCredentialSatisfied(verification)).toBe(false);
  });

  it("returns unverified when the proof passes but the issuer is not trusted", () => {
    const verification = normalizeVerification({
      signals: { ...trustedBound, issuerTrust: false },
      provider: "certo",
    });

    expect(verification.status).toBe("unverified");
    expect(verification.issuer_trust).toBe(false);
  });

  it("returns rejected for revoked, expired, altered, invalid, inconsistent, or reused credentials", () => {
    const cases: VerificationSignals[] = [
      { ...trustedBound, revocationStatus: "revoked" },
      { ...trustedBound, expired: true },
      { ...trustedBound, documentIntegrity: false },
      { ...trustedBound, cryptographicProof: false },
      { ...trustedBound, inconsistent: true },
      { ...trustedBound, reused: true },
    ];

    for (const signals of cases) {
      const verification = normalizeVerification({ signals, provider: "certo" });
      expect(verification.status).toBe("rejected");
      expect(mandatoryCredentialSatisfied(verification)).toBe(false);
    }
  });

  it("returns unverified when the credential cannot be checked", () => {
    const missingKey = normalizeVerification({
      signals: {
        ...trustedBound,
        cryptographicProof: null,
        issuerTrust: null,
      },
      provider: "certo",
    });
    const unsupported = normalizeVerification({
      signals: { ...trustedBound, unsupportedFormat: true },
      provider: "certo",
    });

    expect(missingKey.status).toBe("unverified");
    expect(unsupported.status).toBe("unverified");
    expect(mandatoryCredentialSatisfied(missingKey)).toBe(false);
  });

  it("returns declared when the candidate supplied the credential without evidence", () => {
    const verification = normalizeVerification({
      signals: {
        documentIntegrity: null,
        cryptographicProof: null,
        issuerTrust: null,
        revocationStatus: "unknown",
        holderBinding: "unknown",
        declaredOnly: true,
      },
      provider: "mock",
    });

    expect(verification.status).toBe("declared");
    expect(mandatoryCredentialSatisfied(verification)).toBe(false);
  });
});
