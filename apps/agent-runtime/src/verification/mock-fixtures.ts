import { holderBindingFor } from "./holder";
import type { VerificationSignals } from "./status";

interface MockFixture {
  subjectId?: string;
  signals: VerificationSignals;
}

export const MOCK_FIXTURES: Record<string, MockFixture> = {
  "fixture-valid": {
    subjectId: "candidate@example.com",
    signals: {
      documentIntegrity: true,
      cryptographicProof: true,
      issuerTrust: true,
      revocationStatus: "not_revoked",
      holderBinding: "unknown",
    },
  },
  "fixture-missing-key": {
    signals: {
      documentIntegrity: true,
      cryptographicProof: null,
      issuerTrust: null,
      revocationStatus: "unknown",
      holderBinding: "unknown",
    },
  },
};

const UNVERIFIED: VerificationSignals = {
  documentIntegrity: null,
  cryptographicProof: null,
  issuerTrust: null,
  revocationStatus: "unknown",
  holderBinding: "unknown",
};

export function mockSignalsFor(
  credentialId: string | undefined,
  holderId?: string,
): VerificationSignals {
  const fixture = credentialId ? MOCK_FIXTURES[credentialId] : undefined;
  if (!fixture) return { ...UNVERIFIED };
  const signals = { ...fixture.signals };
  if (fixture.subjectId) {
    signals.holderBinding = holderBindingFor(
      { recipient: { email: fixture.subjectId } },
      holderId,
    );
  }
  return signals;
}
