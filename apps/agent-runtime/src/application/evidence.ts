import { ApplicationError } from "./errors";

export const EVIDENCE_KINDS = ["experience", "skill", "education", "certification"] as const;
export const CREDENTIAL_STATUSES = ["verified", "unverified", "not_applicable"] as const;

export type EvidenceKind = (typeof EVIDENCE_KINDS)[number];
export type CredentialStatus = (typeof CREDENTIAL_STATUSES)[number];
export type ProfileCredentialStatus =
  | CredentialStatus
  | "declared"
  | "partially_verified"
  | "rejected";

export interface EvidenceItem {
  id: string;
  kind: EvidenceKind;
  text: string;
  credentialStatus: CredentialStatus;
}

const KINDS = new Set<string>(EVIDENCE_KINDS);
const STATUSES = new Set<string>(CREDENTIAL_STATUSES);

export function parseEvidence(value: unknown): EvidenceItem[] {
  if (!Array.isArray(value)) {
    throw new ApplicationError("evidence must be an array.", 422, "invalid_input");
  }
  const seen = new Set<string>();
  return value.map((item) => {
    if (typeof item !== "object" || item === null) {
      throw new ApplicationError("evidence item is invalid.", 422, "invalid_input");
    }
    const row = item as Record<string, unknown>;
    if (typeof row.id !== "string" || row.id.trim() === "") {
      throw new ApplicationError("evidence id is required.", 422, "invalid_input");
    }
    if (seen.has(row.id)) {
      throw new ApplicationError(`Duplicate evidence "${row.id}".`, 422, "invalid_input");
    }
    seen.add(row.id);
    if (typeof row.text !== "string" || row.text.trim() === "") {
      throw new ApplicationError("evidence text is required.", 422, "invalid_input");
    }
    if (typeof row.kind !== "string" || !KINDS.has(row.kind)) {
      throw new ApplicationError("evidence kind is invalid.", 422, "invalid_input");
    }
    if (typeof row.credentialStatus !== "string" || !STATUSES.has(row.credentialStatus)) {
      throw new ApplicationError("credential status is invalid.", 422, "invalid_input");
    }
    return {
      id: row.id,
      text: row.text,
      kind: row.kind as EvidenceKind,
      credentialStatus: row.credentialStatus as CredentialStatus,
    };
  });
}

/**
 * Maps evidence credentialStatus based on the evidence kind:
 * - For certification evidence: maps verified → "verified",
 *   declared/partially_verified/unverified/rejected → "unverified"
 * - For non-certification evidence: maps to "not_applicable"
 */
export function toApplicationEvidence(
  evidence: readonly (Omit<EvidenceItem, "credentialStatus"> & {
    credentialStatus: ProfileCredentialStatus;
  })[],
): EvidenceItem[] {
  const result = evidence.map((item) => {
    if (item.kind === 'certification') {
      const statusMap: Record<string, CredentialStatus> = {
        verified: 'verified',
        declared: 'unverified',
        partially_verified: 'unverified',
        unverified: 'unverified',
        rejected: 'unverified',
      };
      return {
        ...item,
       credentialStatus: (statusMap[item.credentialStatus] ?? 'unverified') as CredentialStatus,
      };
    }
    // Non-certification evidence gets "not_applicable"
    return {
      ...item,
       credentialStatus: 'not_applicable' as const,
    };
  });
  return result;
}

export function applicationEvidenceFromCertifications(
  certifications: readonly { id: string; name: string; status: ProfileCredentialStatus }[],
): EvidenceItem[] {
  return toApplicationEvidence(certifications.map((certification) => ({
    id: certification.id,
    kind: "certification" as const,
    text: certification.name,
    credentialStatus: certification.status,
  })));
}
