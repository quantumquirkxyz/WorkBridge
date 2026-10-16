import type { MatchDecision } from "@puente/domain";
import { ApplicationError } from "./errors";
import type { EvidenceItem } from "./evidence";

export interface DraftFragment {
  source: "evidence" | "vacancy" | "match";
  evidenceIds: string[];
  text: string;
}

export interface ApplicationDocuments {
  cv: DraftFragment[];
  coverLetter: DraftFragment[];
  application: DraftFragment[];
}

export function vacancyIntro(title: string): string {
  return `Postulación a ${title}.`;
}

export function gapLine(description: string): string {
  return `Brecha señalada por el matching: ${description}`;
}

export function generateDocuments(input: {
  vacancyTitle: string;
  evidence: readonly EvidenceItem[];
  selectedIds: readonly string[];
  match: MatchDecision;
}): ApplicationDocuments {
  const evidenceFragments: DraftFragment[] = input.selectedIds.map((id) => {
    const item = input.evidence.find((entry) => entry.id === id);
    if (!item) {
      throw new ApplicationError(`Unknown evidence "${id}".`, 422, "unknown_evidence");
    }
    return { source: "evidence", evidenceIds: [item.id], text: item.text };
  });
  const intro: DraftFragment = {
    source: "vacancy",
    evidenceIds: [],
    text: vacancyIntro(input.vacancyTitle),
  };
  const gaps: DraftFragment[] = input.match.gaps.map((gap) => ({
    source: "match",
    evidenceIds: [],
    text: gapLine(gap.description),
  }));
  const documents: ApplicationDocuments = {
    cv: evidenceFragments,
    coverLetter: [intro, ...evidenceFragments],
    application: [intro, ...evidenceFragments, ...gaps],
  };
  assertDocumentsGrounded(documents, input);
  return documents;
}

export function assertDocumentsGrounded(
  documents: ApplicationDocuments,
  input: {
    vacancyTitle: string;
    evidence: readonly EvidenceItem[];
    match: MatchDecision;
  },
): void {
  const evidenceText = new Set(input.evidence.map((item) => item.text));
  const gapText = new Set(input.match.gaps.map((gap) => gapLine(gap.description)));
  const intro = vacancyIntro(input.vacancyTitle);
  const fragments = [...documents.cv, ...documents.coverLetter, ...documents.application];
  for (const fragment of fragments) {
    const grounded =
      (fragment.source === "evidence" &&
        fragment.evidenceIds.length === 1 &&
        evidenceText.has(fragment.text)) ||
      (fragment.source === "vacancy" && fragment.text === intro && fragment.evidenceIds.length === 0) ||
      (fragment.source === "match" && gapText.has(fragment.text) && fragment.evidenceIds.length === 0);
    if (!grounded) {
      throw new ApplicationError(
        "Draft text is not grounded in supplied evidence or the match decision.",
        422,
        "invented_evidence",
      );
    }
  }
}
