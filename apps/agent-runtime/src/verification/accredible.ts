import { Ajv2020 } from "ajv/dist/2020.js";
import { holderBindingFor } from "./holder";
import { isPast, optionalBoolean, revocationFrom } from "./payload-fields";
import type { EvidenceItem, VerificationSignals } from "./status";

const schema = {
  type: "object",
  additionalProperties: true,
  required: ["credential"],
  properties: {
    credential: {
      type: "object",
      additionalProperties: true,
      properties: {
        expired_on: { type: ["string", "null"] },
        revoked: { type: "boolean" },
        document_integrity: { type: "boolean" },
        cryptographic_proof: { type: "boolean" },
        recipient: {
          type: "object",
          additionalProperties: true,
          properties: { email: { type: "string" } },
        },
        issuer: {
          type: "object",
          additionalProperties: true,
          properties: { name: { type: "string" } },
        },
      },
    },
  },
} as const;

const validate = new Ajv2020({ allErrors: true, strict: false }).compile(schema);

export interface AccredibleCredentialBody {
  credential: {
    expired_on?: string | null;
    revoked?: boolean;
    document_integrity?: boolean;
    cryptographic_proof?: boolean;
    recipient?: { email?: string };
    issuer?: { name?: string };
  };
}

export function parseAccredibleCredential(value: unknown): AccredibleCredentialBody | undefined {
  if (!validate(value)) return undefined;
  return value as AccredibleCredentialBody;
}

export function signalsFromAccredible(
  body: AccredibleCredentialBody,
  holderId: string | undefined,
  now = new Date(),
): VerificationSignals {
  const credential = body.credential;
  return {
    documentIntegrity: optionalBoolean(credential.document_integrity),
    cryptographicProof: optionalBoolean(credential.cryptographic_proof),
    issuerTrust: credential.issuer?.name ? true : null,
    revocationStatus: revocationFrom(credential.revoked),
    holderBinding: holderBindingFor(
      { recipient: { email: credential.recipient?.email } },
      holderId,
    ),
    expired: isPast(credential.expired_on, now),
  };
}

export function accredibleEvidence(): EvidenceItem[] {
  return [{ check: "accredible_credential", result: "success" }];
}
