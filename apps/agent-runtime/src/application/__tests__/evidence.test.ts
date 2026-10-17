import { describe, expect, it } from "vitest";
import type { EvidenceItem, ProfileCredentialStatus } from "../evidence";
import { toApplicationEvidence } from "../evidence";

function profileEvidence(overrides: {
  id?: string;
  kind: EvidenceItem["kind"];
  text?: string;
  credentialStatus: ProfileCredentialStatus;
}): Omit<EvidenceItem, "credentialStatus"> & {
  credentialStatus: ProfileCredentialStatus;
} {
  return {
    id: overrides.id ?? "cert-1",
    kind: overrides.kind,
    text: overrides.text ?? "Curso de ofimática del candidato.",
    credentialStatus: overrides.credentialStatus,
  };
}

describe("toApplicationEvidence", () => {
  it("maps a verified certification to verified", () => {
    const result = toApplicationEvidence([
      profileEvidence({ kind: "certification", credentialStatus: "verified" }),
    ]);
    expect(result).toEqual([
      {
        id: "cert-1",
        kind: "certification",
        text: "Curso de ofimática del candidato.",
        credentialStatus: "verified",
      },
    ]);
  });

  it("maps declared, partially_verified, unverified, and rejected certifications to unverified", () => {
    const statuses: ProfileCredentialStatus[] = [
      "declared",
      "partially_verified",
      "unverified",
      "rejected",
    ];
    for (const status of statuses) {
      const result = toApplicationEvidence([
        profileEvidence({ kind: "certification", credentialStatus: status }),
      ]);
      expect(result[0]?.credentialStatus).toBe("unverified");
    }
  });

  it("maps non-certification evidence to not_applicable regardless of input status", () => {
    const statuses: ProfileCredentialStatus[] = [
      "verified",
      "declared",
      "partially_verified",
      "unverified",
      "rejected",
    ];
    const kinds: EvidenceItem["kind"][] = ["experience", "skill", "education"];
    for (const kind of kinds) {
      for (const status of statuses) {
        const result = toApplicationEvidence([
          profileEvidence({ kind, credentialStatus: status }),
        ]);
        expect(result[0]?.credentialStatus).toBe("not_applicable");
      }
    }
  });

  it("preserves id, kind, and text on every item", () => {
    const result = toApplicationEvidence([
      profileEvidence({
        id: "exp-9",
        kind: "experience",
        text: "Apoyé el inventario del negocio familiar.",
        credentialStatus: "declared",
      }),
      profileEvidence({
        id: "cert-2",
        kind: "certification",
        text: "Certificado de inglés.",
        credentialStatus: "verified",
      }),
    ]);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      id: "exp-9",
      kind: "experience",
      text: "Apoyé el inventario del negocio familiar.",
      credentialStatus: "not_applicable",
    });
    expect(result[1]).toEqual({
      id: "cert-2",
      kind: "certification",
      text: "Certificado de inglés.",
      credentialStatus: "verified",
    });
  });

  it("returns an empty array for empty input", () => {
    expect(toApplicationEvidence([])).toEqual([]);
  });
});
