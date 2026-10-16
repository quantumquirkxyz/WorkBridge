import type { VerificationSignals } from "./status.js";

export const MOCK_FIXTURES: Record<string, VerificationSignals> = {
  "fixture-valid": {
    documentIntegrity: true,
    cryptographicProof: true,
    issuerTrust: true,
    revocationStatus: "not_revoked",
    holderBinding: "bound",
  },
  "fixture-missing-key": {
    documentIntegrity: true,
    cryptographicProof: null,
    issuerTrust: null,
    revocationStatus: "unknown",
    holderBinding: "unknown",
  },
};

const UNVERIFIED: VerificationSignals = {
  documentIntegrity: null,
  cryptographicProof: null,
  issuerTrust: null,
  revocationStatus: "unknown",
  holderBinding: "unknown",
};

export function mockSignalsFor(credentialId: string | undefined): VerificationSignals {
  if (!credentialId) return UNVERIFIED;
  return MOCK_FIXTURES[credentialId] ?? UNVERIFIED;
}
