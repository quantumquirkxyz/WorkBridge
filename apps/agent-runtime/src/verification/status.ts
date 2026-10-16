export const VERIFICATION_STATUSES = ["verified", "declared", "unverified", "rejected"] as const;

export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export type RevocationStatus = "not_revoked" | "revoked" | "unknown";

export type HolderBinding = "bound" | "unbound" | "unknown";

export type ProviderName = "certo" | "accredible" | "credly" | "mock";

export interface EvidenceItem {
  check: string;
  result: "success" | "error" | "warning" | "skipped";
  message?: string;
}

export interface VerificationSignals {
  documentIntegrity: boolean | null;
  cryptographicProof: boolean | null;
  issuerTrust: boolean | null;
  revocationStatus: RevocationStatus;
  holderBinding: HolderBinding;
  declaredOnly?: boolean;
  expired?: boolean;
  inconsistent?: boolean;
  unsupportedFormat?: boolean;
  reused?: boolean;
}

export interface CredentialVerification {
  status: VerificationStatus;
  document_integrity: boolean | null;
  cryptographic_proof: boolean | null;
  issuer_trust: boolean | null;
  revocation_status: RevocationStatus;
  holder_binding: HolderBinding;
  provider: ProviderName;
  externally_verified: boolean;
  evidence: EvidenceItem[];
  fallback_reason?: string;
}

export function deriveStatus(signals: VerificationSignals): VerificationStatus {
  if (signals.declaredOnly) return "declared";
  if (signals.unsupportedFormat) return "unverified";
  if (
    signals.documentIntegrity === false ||
    signals.cryptographicProof === false ||
    signals.revocationStatus === "revoked" ||
    signals.expired === true ||
    signals.inconsistent === true ||
    signals.reused === true ||
    signals.holderBinding === "unbound"
  ) {
    return "rejected";
  }
  if (signals.documentIntegrity !== true || signals.cryptographicProof !== true) {
    return "unverified";
  }
  const trustComplete =
    signals.issuerTrust === true && signals.revocationStatus === "not_revoked";
  const holderBound = signals.holderBinding === "bound";
  if (trustComplete && holderBound) return "verified";
  return "unverified";
}

export function mandatoryCredentialSatisfied(
  verification: Pick<CredentialVerification, "status">,
): boolean {
  return verification.status === "verified";
}

export function normalizeVerification(input: {
  signals: VerificationSignals;
  provider: ProviderName;
  evidence?: EvidenceItem[];
  fallbackReason?: string;
}): CredentialVerification {
  const verification: CredentialVerification = {
    status: deriveStatus(input.signals),
    document_integrity: input.signals.documentIntegrity,
    cryptographic_proof: input.signals.cryptographicProof,
    issuer_trust: input.signals.issuerTrust,
    revocation_status: input.signals.revocationStatus,
    holder_binding: input.signals.holderBinding,
    provider: input.provider,
    externally_verified: input.provider !== "mock",
    evidence: input.evidence ?? [],
  };
  if (input.fallbackReason) verification.fallback_reason = input.fallbackReason;
  return verification;
}
