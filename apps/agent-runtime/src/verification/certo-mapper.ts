import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Ajv2020 } from "ajv/dist/2020.js";
import { holderBindingFor } from "./holder.js";
import type { EvidenceItem, VerificationSignals } from "./status.js";

const schema = JSON.parse(
  readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "certo-verify-result.schema.json"),
    "utf8",
  ),
) as object;

const validate = new Ajv2020({ allErrors: true, strict: false }).compile(schema);

export interface CertoCheck {
  check: string;
  result: "success" | "error" | "warning";
  message?: string | null;
}

export interface CertoVerifyResult {
  verified: boolean;
  checks?: CertoCheck[];
  credential?: Record<string, unknown>;
  error?: string;
}

export function parseCertoVerifyResult(value: unknown): CertoVerifyResult | undefined {
  if (!validate(value)) return undefined;
  return value as CertoVerifyResult;
}

export function signalsFromCerto(
  result: CertoVerifyResult,
  holderId: string | undefined,
): VerificationSignals {
  const checks = result.checks ?? [];
  const integrity = findCheck(checks, ["integrity", "document", "tamper"]);
  const proof = findCheck(checks, ["proof", "signature"]);
  const issuer = findCheck(checks, ["issuer", "trust", "signer"]);
  const revocation = findCheck(checks, ["revocation", "revoked"]);
  const expiration = findCheck(checks, ["expiration", "expiry", "expired"]);
  const format = findCheck(checks, ["format"]);
  const proofFlag = flag(proof, null);
  const proved = proofFlag === true;

  return {
    documentIntegrity: integrity ? flag(integrity, null) : proved ? true : null,
    cryptographicProof: proofFlag,
    issuerTrust: issuer ? flag(issuer, null) : proved ? true : null,
    revocationStatus: revocationStatus(revocation),
    holderBinding: holderBindingFor(result.credential, holderId),
    expired: expiration?.result === "error",
    unsupportedFormat: format?.result === "error",
    inconsistent: issuerIdentityInconsistent(checks),
    reused: checks.some(
      (check) =>
        check.result === "error" && /reuse|duplicate/.test(check.check.toLowerCase()),
    ),
  };
}

export function evidenceFromCerto(
  result: CertoVerifyResult,
  token: string | undefined,
): EvidenceItem[] {
  return (result.checks ?? []).map((check) => {
    const item: EvidenceItem = { check: check.check, result: check.result };
    if (typeof check.message === "string" && check.message !== "") {
      item.message = redact(check.message, token);
    }
    return item;
  });
}

export function redact(text: string, token: string | undefined): string {
  if (!token) return text;
  return text.replaceAll(token, "[redacted]");
}

function findCheck(checks: CertoCheck[], needles: string[]): CertoCheck | undefined {
  return checks.find((check) =>
    needles.some((needle) => check.check.toLowerCase().includes(needle)),
  );
}

function flag(check: CertoCheck | undefined, fallback: boolean | null): boolean | null {
  if (!check) return fallback;
  if (check.result === "success") return true;
  if (check.result === "error") return false;
  return null;
}

function revocationStatus(
  check: CertoCheck | undefined,
): VerificationSignals["revocationStatus"] {
  if (!check) return "unknown";
  if (check.result === "error") return "revoked";
  if (check.result === "success") return "not_revoked";
  return "unknown";
}

function issuerIdentityInconsistent(checks: CertoCheck[]): boolean {
  return checks.some(
    (check) =>
      check.result === "error" &&
      /inconsistent|mismatch/i.test(`${check.check} ${check.message ?? ""}`),
  );
}
