/**
 * TypeScript mirror of the JSON Schema 2020-12 contracts in `src/schemas`.
 * The schemas are the source of truth; these types exist so application code
 * gets compile-time help. Drift is caught by the contract tests.
 */

export type RequirementKind =
  | "skill"
  | "experience"
  | "education"
  | "certification"
  | "language"
  | "physical"
  | "other";

export type RequirementCategory = "mandatory" | "desirable";

export type AlertClassification =
  | "ambiguous"
  | "potentially_discriminatory"
  | "prohibited";

export type AlertDisposition = "blocked" | "human_review";

export type MatchStrategy = "exact" | "alias" | "fuzzy" | "none";

export type VacancySource = "manual" | "json" | "pdf" | "image";

export type VacancyStatus = "accepted" | "requires_human_review" | "blocked";

export interface CanonicalSkill {
  matched: boolean;
  skillId: string | null;
  labelEs: string | null;
  labelEn: string | null;
  escoLabel: string | null;
  escoUri: string | null;
  taxonomyVersion: string;
  matchConfidence: number;
  matchStrategy: MatchStrategy;
}

export interface Requirement {
  id: string;
  kind: RequirementKind;
  category: RequirementCategory;
  originalWording: string;
  normalizedWording: string;
  canonical: CanonicalSkill;
  level: number | null;
  justification: string | null;
  alertId: string | null;
  rankingEligible: boolean;
  excludedFromRanking: boolean;
}

export interface AlertResolution {
  decision: "approved" | "rejected";
  reviewer: string;
  resolvedAt: string;
}

export interface Alert {
  id: string;
  requirementId: string;
  classification: AlertClassification;
  ruleId: string;
  reason: string;
  matchedText: string;
  disposition: AlertDisposition;
  resolved: boolean;
  resolution?: AlertResolution | null;
}

export interface ReviewItem {
  reviewId: string;
  requirementId: string;
  alertId: string;
  classification: Exclude<AlertClassification, "prohibited">;
  status: "pending_human_review";
  reason: string;
}

export interface Location {
  country: string;
  province: string | null;
  district: string | null;
  raw: string | null;
}

export interface JobRequirementsMetadata {
  inputKind: VacancySource;
  extractor: string;
  extractedAt: string;
  rawText: string | null;
  requirementCount: number;
  mandatoryCount: number;
  desirableCount: number;
  alertCount: number;
  excludedCount: number;
}

export interface JobRequirements {
  schemaVersion: "1.0.0";
  vacancyId: string;
  title: string;
  employer: string | null;
  source: VacancySource;
  capturedAt: string;
  locale: string;
  taxonomyVersion: string;
  status: VacancyStatus;
  location: Location;
  requirements: Requirement[];
  alerts: Alert[];
  reviewQueue: ReviewItem[];
  blockingReasons: string[];
  metadata: JobRequirementsMetadata;
}
