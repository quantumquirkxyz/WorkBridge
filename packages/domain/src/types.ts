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

export type AgentId =
  | "exploration"
  | "profile_and_evidence"
  | "market_and_matching"
  | "training";

export type EnvelopeKind = "request" | "response" | "event";

export type ActorRole = "candidate" | "counselor" | "employer" | "system";

/**
 * Agent-to-agent message. `trace_id` and `idempotency_key` are required so
 * every hop can be audited and replayed without double execution.
 */
export interface AgentEnvelope {
  trace_id: string;
  idempotency_key: string;
  agent: AgentId;
  kind: EnvelopeKind;
  payload: Record<string, unknown>;
}

/**
 * Declared credential claim supplied to the workflow.
 * This is not the CredentialVerification contract from issue #6.
 */
export interface DeclaredCredentialClaim {
  id: string;
  name: string;
}

/**
 * REST body for `POST /internal/workflow/runs`.
 * Candidate text is an intake port, not the persisted CandidateProfile from issue #4.
 */
export interface WorkflowRunRequest {
  trace_id: string;
  idempotency_key: string;
  candidateText: string;
  vacancyText: string;
  declaredCredentials: DeclaredCredentialClaim[];
  actor: {
    id: string;
    role: ActorRole;
  };
  requestedTools: string[];
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
