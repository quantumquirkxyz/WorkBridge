import { ApplicationError } from "./errors";

export interface EvidenceItem {
  id: string;
  kind: "experience" | "skill" | "education" | "certification";
  text: string;
  credentialStatus: "verified" | "unverified" | "not_applicable";
}

const KINDS = new Set(["experience", "skill", "education", "certification"]);
const STATUSES = new Set(["verified", "unverified", "not_applicable"]);

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
      kind: row.kind as EvidenceItem["kind"],
      credentialStatus: row.credentialStatus as EvidenceItem["credentialStatus"],
    };
  });
}
