import { Ajv2020 } from "ajv/dist/2020.js";
import { holderBindingFor } from "./holder.js";
import { isPast, optionalBoolean, revocationFrom } from "./payload-fields.js";
import type { EvidenceItem, VerificationSignals } from "./status.js";

const schema = {
  type: "object",
  additionalProperties: true,
  required: ["recipient"],
  properties: {
    revoked: { type: "boolean" },
    document_integrity: { type: "boolean" },
    cryptographic_proof: { type: "boolean" },
    expires: { type: ["string", "null"] },
    recipient: {
      type: "object",
      additionalProperties: true,
      required: ["identity"],
      properties: {
        identity: { type: "string" },
        hashed: { type: "boolean" },
      },
    },
    badge: { type: "object" },
  },
} as const;

const validate = new Ajv2020({ allErrors: true, strict: false }).compile(schema);

export interface CredlyAssertion {
  revoked?: boolean;
  document_integrity?: boolean;
  cryptographic_proof?: boolean;
  expires?: string | null;
  recipient: { identity: string; hashed?: boolean };
  badge?: { issuer?: { name?: string } };
}

export function parseCredlyAssertion(value: unknown): CredlyAssertion | undefined {
  if (!validate(value)) return undefined;
  return value as CredlyAssertion;
}

export function signalsFromCredly(
  assertion: CredlyAssertion,
  holderId: string | undefined,
  now = new Date(),
): VerificationSignals {
  const hashed = assertion.recipient.hashed === true;
  return {
    documentIntegrity: optionalBoolean(assertion.document_integrity),
    cryptographicProof: optionalBoolean(assertion.cryptographic_proof),
    issuerTrust: assertion.badge?.issuer?.name ? true : null,
    revocationStatus: revocationFrom(assertion.revoked),
    holderBinding: hashed
      ? "unknown"
      : holderBindingFor({ recipient: { email: assertion.recipient.identity } }, holderId),
    expired: isPast(assertion.expires, now),
  };
}

export function credlyEvidence(): EvidenceItem[] {
  return [{ check: "credly_assertion", result: "success" }];
}
