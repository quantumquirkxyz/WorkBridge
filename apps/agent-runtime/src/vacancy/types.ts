import type {
  JobRequirements,
  Requirement,
  RequirementKind,
  ReviewItem,
  SkillTaxonomy,
  VacancySource,
  Location,
} from "@puente/domain";

export interface RawRequirementInput {
  text: string;
  kind?: RequirementKind;
  level?: number | null;
  justification?: string | null;
}

export type RawRequirement = string | RawRequirementInput;

export interface RawVacancy {
  vacancyId?: string;
  title: string;
  employer?: string | null;
  employerOrgId?: string;
  locale?: string;
  location?: Partial<Location> | string | null;
  rawText?: string;
  mandatory?: RawRequirement[];
  desirable?: RawRequirement[];
}

export type VacancyInput =
  | { kind: "manual"; vacancy: RawVacancy }
  | { kind: "json"; json: string | RawVacancy | Record<string, unknown> }
  | { kind: "pdf"; data: Uint8Array; filename?: string }
  | { kind: "image"; data: Uint8Array; filename?: string; mimeType?: string };

export interface ExtractedVacancy {
  source: VacancySource;
  extractor: string;
  vacancyId: string | null;
  title: string;
  employer: string | null;
  employerOrgId?: string;
  locale: string;
  location: Location;
  rawText: string | null;
  mandatory: RawRequirementInput[];
  desirable: RawRequirementInput[];
}

export interface TextExtractionResult {
  text: string;
  extractor: string;
}

/**
 * Pluggable extraction boundary for binary inputs. Production wiring uses the
 * `unpdf` and `tesseract.js` defaults; tests inject deterministic fakes so the
 * suite never depends on OCR models or the network.
 */
export interface VacancyExtractionPort {
  pdf?: (data: Uint8Array, filename?: string) => Promise<TextExtractionResult>;
  image?: (
    data: Uint8Array,
    mimeType?: string,
    filename?: string,
  ) => Promise<TextExtractionResult>;
}

export interface NormalizeVacancyOptions {
  vacancyId?: string;
  capturedAt?: string;
  now?: () => Date;
  extraction?: VacancyExtractionPort;
  taxonomy?: SkillTaxonomy;
}

export interface ReviewDecision {
  reviewId: string;
  decision: "approved" | "rejected";
  reviewer: string;
  resolvedAt?: string;
}

export type { JobRequirements, Requirement, ReviewItem };
