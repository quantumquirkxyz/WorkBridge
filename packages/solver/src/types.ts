/**
 * Deterministic geographic matching contracts.
 *
 * The solver consumes a *projection* of the candidate profile and of the
 * normalized vacancy requirements. Keeping its own input contract makes the
 * scoring seam independently testable and lets the profile layer (ticket #4)
 * adapt onto it without coupling the solver to a profile implementation.
 */

export type SkillLevel = 0 | 1 | 2 | 3 | 4;

export type EvidenceSource = "declared" | "extracted" | "verified" | "inferred";

export type TransportMode = "driving" | "transit" | "walking" | "cycling";

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface CandidateSkillSignal {
  /** Canonical taxonomy id (e.g. `PA-OFF-0002`). */
  skillId: string;
  /** Demonstrated level, 0–4. */
  level: SkillLevel;
  /** Highest provenance backing the level. */
  source: EvidenceSource;
  /** Number of supporting evidence records. */
  evidenceCount: number;
  /** 0–1 confidence assigned by the profile layer. */
  confidence: number;
}

export interface CandidateAvailability {
  /** ISO weekdays, 0 = Sunday … 6 = Saturday. */
  days: number[];
  /** Minutes from midnight; the window is [startMinute, endMinute). */
  startMinute: number;
  endMinute: number;
  /** Total hours per week the candidate can work. */
  weeklyHours: number;
}

export interface CandidateTransport {
  hasVehicle: boolean;
  /** Features the candidate needs the route/vacancy to provide (e.g. `wheelchair`). */
  accessibilityNeeds?: string[];
  /** Maximum acceptable one-way commute in minutes. */
  maxCommuteMinutes: number;
  /** Preferred modes in priority order; the first is used for routing. */
  modes?: TransportMode[];
}

export interface SolverCandidate {
  candidateId: string;
  home: GeoPoint;
  skills: CandidateSkillSignal[];
  /** Overall experience level, 0–4. */
  experienceLevel: SkillLevel;
  /** Count of experience records classified relevant or partially relevant. */
  relevantEvidenceCount: number;
  availability: CandidateAvailability;
  transport: CandidateTransport;
  /** Monthly salary expectation in USD. */
  expectedSalaryUsd: number;
  /** Monthly salary floor in USD. Below this the candidate declines. */
  minimumSalaryUsd?: number;
}

export interface VacancyRequirement {
  requirementId: string;
  /** Canonical taxonomy id; `null` when the wording could not be mapped. */
  skillId: string | null;
  wording: string;
  /** Minimum level required, 0–4. Defaults to 1. */
  requiredLevel: SkillLevel;
}

export interface VacancySchedule {
  days: number[];
  startMinute: number;
  endMinute: number;
  weeklyHours: number;
}

export interface SolverVacancy {
  vacancyId: string;
  location: GeoPoint;
  mandatory: VacancyRequirement[];
  desirable: VacancyRequirement[];
  schedule: VacancySchedule;
  /** Monthly salary range in USD. */
  salaryMinUsd: number;
  salaryMaxUsd: number;
  /** Openings available; a value below 1 is a capacity hard-constraint failure. */
  capacity: number;
  /** Accessibility features the vacancy's workplace provides (e.g. `wheelchair`, `elevator`). */
  accessibilityRequirements?: string[];
}

export type Aptitude = "apt" | "apt_with_gaps" | "not_currently_apt";

export type ScoreDimension =
  | "technical"
  | "experience"
  | "availability"
  | "transport"
  | "salary";

export interface ScoreBreakdownItem {
  dimension: ScoreDimension;
  /** Normalized weight, e.g. 0.3. */
  weight: number;
  /** Dimension score, 0–100. */
  rawScore: number;
  /** `weight * rawScore`, rounded to two decimals. */
  weightedScore: number;
  reasons: string[];
}

/** The exhaustive set of hard constraints the solver can report. */
export const HARD_CONSTRAINT_IDS = [
  "mandatory_skills",
  "mandatory_requirements_mapped",
  "schedule",
  "salary",
  "capacity",
  "geographic_commute",
  "geographic_accessibility",
] as const;

export type HardConstraintId = (typeof HARD_CONSTRAINT_IDS)[number];

export interface HardConstraintResult {
  id: HardConstraintId;
  satisfied: boolean;
  reason: string;
}

export interface RouteRequest {
  origin: GeoPoint;
  destination: GeoPoint;
  mode: TransportMode;
}

export interface RouteEstimate {
  commuteMinutes: number;
  distanceKm: number;
  accessible: boolean;
  source: "google_maps" | "local_matrix";
  /** Present when a provider was unavailable and a fallback produced the route. */
  fallbackReason?: string;
}

export interface RoutingPort {
  route(request: RouteRequest): Promise<RouteEstimate>;
}

export interface PromotionRecord {
  /** The candidate is in the promotion band and no better eligible candidate exists. */
  eligible: boolean;
  /** A human approved and the promotion was applied. */
  applied: boolean;
  requiresHumanApproval: boolean;
  reason: string;
}

export interface HumanApprovalDecision {
  candidateId: string;
  vacancyId: string;
  approved: boolean;
  reviewer: string;
  approvedAt?: string;
}

export interface MatchDecision {
  schemaVersion: "1.0.0";
  candidateId: string;
  vacancyId: string;
  aptitude: Aptitude;
  /** Weighted score, 0–100 integer (after any applied promotion). */
  score: number;
  /** Score before promotion; equal to `score` unless promotion was applied. */
  baseScore: number;
  scoreBreakdown: ScoreBreakdownItem[];
  hardConstraints: HardConstraintResult[];
  failedConstraints: HardConstraintId[];
  reasons: string[];
  /** Deterministic ordering key; never derived from protected attributes. */
  tieBreakKey: string;
  promotion: PromotionRecord;
  routing: RouteEstimate;
  decidedAt: string;
}

export interface MatchOptions {
  now?: () => Date;
  routing?: RoutingPort;
  /** Base decisions for other candidates on the same vacancy. */
  peers?: readonly MatchDecision[];
  /** Human approval for a one-point promotion of this candidate/vacancy pair. */
  approval?: HumanApprovalDecision;
}
