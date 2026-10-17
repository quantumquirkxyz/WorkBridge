/**

 * TypeScript mirror of the JSON Schema 2020-12 contracts in `./schemas`.
 *
 * The JSON Schemas remain the single source of truth; these types exist so
 * application code gets compile-time safety. `tests/contracts.test.ts`
 * guards the two against drift.
 */

export type Provenance = 'declared' | 'extracted' | 'verified' | 'inferred';
export type SkillKind = 'technical' | 'soft';
export type SkillLevel = 0 | 1 | 2 | 3 | 4;
export type ExperienceType =
  | 'formal_employment'
  | 'informal_work'
  | 'family_business'
  | 'volunteering'
  | 'project'
  | 'academic'
  | 'internship';
export type Relevance =
  | 'relevant'
  | 'partially_relevant'
  | 'not_relevant'
  | 'requires_additional_evidence';
export type CredentialStatus =
  | 'declared'
  | 'verified'
  | 'partially_verified'
  | 'unverified'
  | 'rejected';
export type IntakeSourceKind = 'pdf' | 'image' | 'text' | 'audio_transcript';
export type EducationLevel =
  | 'primary'
  | 'secondary'
  | 'technical'
  | 'undergraduate'
  | 'postgraduate'
  | 'course'
  | 'other';

export interface Evidence {
  id: string;
  claim: string;
  source: Provenance;
  source_ref?: string;
  excerpt?: string;
  confidence: number;
  captured_at?: string;
}

export interface CandidateSkill {
  skill_id: string;
  canonical_name: string;
  original_term: string;
  kind: SkillKind;
  level: SkillLevel;
  evidence_ids: string[];
  source: Provenance;
  confidence: number;
  synonyms?: string[];
  esco_reference?: string;
  normalization_notes?: string[];
}

export interface CandidateExperience {
  id: string;
  experience_type: ExperienceType;
  title: string;
  organization?: string;
  description: string;
  started_at?: string;
  ended_at?: string;
  ongoing?: boolean;
  location?: string;
  source: Provenance;
  relevance: Relevance;
  relevance_reason: string;
  skill_ids: string[];
  evidence_ids: string[];
  confidence: number;
}

export interface CandidateEducation {
  id: string;
  institution: string;
  program: string;
  level?: EducationLevel;
  started_at?: string;
  ended_at?: string;
  ongoing?: boolean;
  source: Provenance;
  evidence_ids: string[];
  confidence: number;
}

export interface CandidateCertification {
  id: string;
  name: string;
  issuer?: string;
  issued_at?: string;
  expires_at?: string;
  credential_url?: string;
  status: CredentialStatus;
  source: Provenance;
  evidence_ids: string[];
  skill_ids?: string[];
  confidence: number;
}

export interface IntakeSource {
  kind: IntakeSourceKind;
  ref: string;
  mime_type?: string;
  byte_length?: number;
  page_count?: number;
  extracted_char_count?: number;
  extraction_method: string;
  extraction_confidence?: number;
  warnings?: string[];
  extracted_at: string;
}

export interface CandidateProfile {
  schema_version: '1.0.0';
  candidate_id: string;
  locale: string;
  created_at: string;
  updated_at: string;
  target_roles?: string[];
  sources: IntakeSource[];
  skills: CandidateSkill[];
  experiences: CandidateExperience[];
  education: CandidateEducation[];
  certifications: CandidateCertification[];
  evidence: Evidence[];
  warnings?: string[];
  trace_id: string;
}

export type WorkModality = 'onsite' | 'hybrid' | 'remote';

export type TransportMode = 'driving' | 'transit' | 'walking' | 'cycling';

export type ContractType =
  | 'full_time'
  | 'part_time'
  | 'fixed_term'
  | 'internship'
  | 'temporary'
  | 'freelance';

export interface PreferenceAvailability {
  /** ISO weekdays, 0 = Sunday … 6 = Saturday. */
  days: number[];
  /** Minutes from midnight; the window is [start_minute, end_minute). */
  start_minute: number;
  end_minute: number;
  weekly_hours: number;
}

export interface PreferenceLocation {
  country: string;
  province: string | null;
  district: string | null;
  raw: string | null;
}

/**
 * Work preferences captured explicitly from the candidate (ticket #7). They are
 * never inferred by an LLM and are persisted as a validated JSON document.
 */
export interface CandidatePreferences {
  schema_version: '1.0.0';
  preferences_id: string;
  candidate_id: string;
  locale: string;
  /** Explicit-capture guard: preferences only ever enter from the candidate. */
  origin: 'candidate_explicit';
  created_at: string;
  updated_at: string;
  target_roles: string[];
  modality: WorkModality;
  max_location: PreferenceLocation;
  max_travel_minutes: number;
  monthly_transport_budget_usd: number;
  minimum_salary_usd: number;
  availability: PreferenceAvailability;
  contract_types: ContractType[];
  transport_modes: TransportMode[];
  willing_to_train: boolean;
  willing_to_intern: boolean;
}

export interface DraftEvidence {
  claim: string;
  source: Provenance;
  source_ref?: string;
  excerpt?: string;
  confidence?: number;
}

export interface DraftSkill {
  original_term: string;
  canonical_hint?: string;
  kind_hint?: SkillKind;
  level_hint?: SkillLevel;
  confidence?: number;
  evidence?: DraftEvidence[];
}

export interface DraftExperience {
  experience_type: ExperienceType;
  title: string;
  organization?: string;
  description: string;
  started_at?: string;
  ended_at?: string;
  ongoing?: boolean;
  location?: string;
  confidence?: number;
  evidence?: DraftEvidence[];
}

export interface DraftEducation {
  institution: string;
  program: string;
  level?: EducationLevel;
  started_at?: string;
  ended_at?: string;
  ongoing?: boolean;
  confidence?: number;
  evidence?: DraftEvidence[];
}

export interface DraftCertification {
  name: string;
  issuer?: string;
  issued_at?: string;
  expires_at?: string;
  credential_url?: string;
  confidence?: number;
  evidence?: DraftEvidence[];
}

export interface ProfileDraft {
  full_name?: string;
  locale?: string;
  target_roles?: string[];
  skills?: DraftSkill[];
  experiences?: DraftExperience[];
  education?: DraftEducation[];
  certifications?: DraftCertification[];
  notes?: string[];
}

export interface IntakeRequest {
  kind: IntakeSourceKind;
  text?: string;
  fileName?: string;
  mimeType?: string;
  contentBase64?: string;
  altText?: string;
  candidateId?: string;
  targetRoles?: string[];
  locale?: string;
  traceId?: string;
}

export type ExtractorKind = 'heuristic' | 'llm' | 'heuristic-fallback';

export interface IntakeResult {
  trace_id: string;
  profile: CandidateProfile;
  extraction: {
    extractor: ExtractorKind;
    needs_review: boolean;
    warnings: string[];
  };
}

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
  /** Compatibility view for profile extraction consumers. */
  skill?: {
    skill_id: string;
    canonical_name: string;
    kind: SkillKind;
    synonyms: string[];
    esco_reference?: string;
  };
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
  /** Optional validated matching payload consumed by agent-runtime's solver seam. */
  matchingInput?: unknown;
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
