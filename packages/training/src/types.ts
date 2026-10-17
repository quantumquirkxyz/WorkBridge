/**
 * Training roadmap contracts.
 *
 * The roadmap engine is a deterministic, offline-first seam: it consumes a
 * **cached** catalog snapshot plus a candidate's gaps and emits a `Roadmap`
 * JSON. It never calls an LLM and never invents an opportunity — every
 * recommendation embeds the exact catalog entry it came from.
 *
 * Ticket #11 requires a roadmap for `apt_with_gaps` and `not_currently_apt`, so
 * the gaps themselves are derived from the deterministic solver output (ticket
 * #8) through `deriveGaps`, and can also be supplied directly.
 */

import type { Aptitude, GeoPoint, SkillLevel, SolverCandidate, SolverVacancy } from "@puente/solver";

export type Modality = "online" | "onsite" | "hybrid";

export type OpportunityType = "course" | "certification" | "project" | "internship";

export type OpportunityFreshness = "fresh" | "stale" | "expired";

/** Technical and soft gaps come from the solver; language gaps come from the taxonomy. */
export type GapKind = "technical" | "soft" | "language";

export interface CoveredSkill {
  /** Canonical taxonomy id (e.g. `PA-IT-0001`). */
  skillId: string;
  /** Level the opportunity can raise the candidate to, 0–4. */
  level: SkillLevel;
}

export interface OpportunitySchedule {
  /** ISO weekdays, 0 = Sunday … 6 = Saturday. */
  days: number[];
  /** Minutes from midnight; the window is [startMinute, endMinute). */
  startMinute: number;
  endMinute: number;
  weeklyHours: number;
}

export interface TrainingOpportunity {
  opportunityId: string;
  title: string;
  provider: string;
  type: OpportunityType;
  url: string;
  language: "es" | "en" | "other";
  /** Canonical specialization slugs (e.g. `it_support`, `customer_service`). */
  specializations: string[];
  /** Skills the opportunity can teach and the level it reaches. */
  coveredSkills: CoveredSkill[];
  /** Skill ids that must already be present before enrolling. */
  prerequisites: string[];
  costUsd: number;
  durationHours: number;
  modality: Modality;
  /** Required for `onsite` / `hybrid`; `null` for `online`. */
  location: GeoPoint | null;
  /** `null` means self-paced (no weekly window). */
  schedule: OpportunitySchedule | null;
  seatsAvailable: number;
  /** 0–1 relevance of the resulting credential for employability. */
  credentialRelevance: number;
  /** Cataloguing source (platform or snapshot), for provenance. */
  source: string;
  /** ISO timestamp of the last catalog refresh, used for freshness. */
  retrievedAt: string;
}

/** The last valid cached snapshot. The Training Agent refreshes it out of band. */
export interface TrainingCatalog {
  schemaVersion: "1.0.0";
  catalogVersion: string;
  source: string;
  retrievedAt: string;
  opportunities: TrainingOpportunity[];
}

export interface TrainingGap {
  skillId: string;
  /** Spanish label when the taxonomy knows it; `null` otherwise. */
  label: string | null;
  kind: GapKind;
  requiredLevel: SkillLevel;
  currentLevel: SkillLevel;
  /** True when the gap blocks a mandatory vacancy requirement. */
  mandatory: boolean;
}

/** A skill the candidate already holds, used to satisfy prerequisites. */
export interface HeldSkill {
  skillId: string;
  level: SkillLevel;
}

export interface AvailabilityWindow {
  /** ISO weekdays, 0 = Sunday … 6 = Saturday. */
  days: number[];
  startMinute: number;
  endMinute: number;
  weeklyHours: number;
}

export interface TrainingPreferences {
  /** Target specialization slugs. Empty means "no preference". */
  specializations: string[];
  /** Hard cost ceiling in USD. Unset means "no ceiling". */
  maxCostUsd?: number;
  /** Hard ceiling on the total roadmap duration in hours. Unset means "no ceiling". */
  maxTotalHours?: number;
  /** Preferred modalities; other modalities are still usable but rank lower. */
  preferredModalities?: Modality[];
  /** Candidate's weekly availability, used for the schedule dimension and constraint. */
  availability?: AvailabilityWindow;
  /** Candidate's home location, used to score on-site access. */
  home?: GeoPoint;
  /** Maximum acceptable one-way commute in minutes. */
  maxCommuteMinutes?: number;
  /** When true, only certificate-bearing opportunities are considered (advisory). */
  requireCredential?: boolean;
}

export interface RoadmapRequest {
  candidateId: string;
  targetVacancyId?: string | null;
  /** From the deterministic solver; only gaps/not-apt states expect a roadmap. */
  aptitude: Aptitude;
  gaps: TrainingGap[];
  /** Skills already held; used to satisfy prerequisites. */
  heldSkills?: HeldSkill[];
  preferences: TrainingPreferences;
}

export type RankingDimension =
  | "gap_coverage"
  | "specialization"
  | "cost"
  | "duration"
  | "modality"
  | "geography"
  | "schedule"
  | "availability"
  | "credential_relevance";

export interface RankingBreakdownItem {
  dimension: RankingDimension;
  /** Normalized weight, e.g. 0.3. */
  weight: number;
  /** Dimension score, 0–100. */
  rawScore: number;
  /** `weight * rawScore`, rounded to two decimals. */
  weightedScore: number;
  reasons: string[];
}

export interface GapContribution {
  skillId: string;
  /** Levels this opportunity contributes toward the gap. */
  addedLevel: number;
}

export interface RankedOpportunity {
  opportunity: TrainingOpportunity;
  /** Weighted score, 0–100 integer. */
  score: number;
  breakdown: RankingBreakdownItem[];
  /** Gaps this opportunity addresses, with the contributed level. */
  coveredGaps: GapContribution[];
  freshness: OpportunityFreshness;
  /** Static feasibility: seats, cost ceiling, expiry, prerequisites, schedule. */
  eligible: boolean;
  exclusionReasons: string[];
  /** Deterministic position after sorting (1-based); 0 before ranking. */
  rank: number;
}

export interface RoadmapRecommendation {
  rank: number;
  score: number;
  scoreBreakdown: RankingBreakdownItem[];
  coveredGaps: GapContribution[];
  /** Spanish explanation with source and freshness. */
  explanationEs: string;
  source: string;
  retrievedAt: string;
  freshness: OpportunityFreshness;
  /** The exact catalog entry; guarantees no invented opportunity. */
  opportunity: TrainingOpportunity;
}

export interface ExcludedOpportunity {
  opportunityId: string;
  reason: string;
}

export interface RoadmapConstraints {
  specializations: string[];
  maxCostUsd: number | null;
  maxTotalHours: number | null;
}

export interface RoadmapTotals {
  costUsd: number;
  durationHours: number;
  recommendationCount: number;
  coveredGapCount: number;
  unresolvedGapCount: number;
}

export interface Roadmap {
  schemaVersion: "1.0.0";
  candidateId: string;
  targetVacancyId: string | null;
  aptitude: Aptitude;
  generatedAt: string;
  catalogVersion: string;
  constraints: RoadmapConstraints;
  gaps: TrainingGap[];
  recommendations: RoadmapRecommendation[];
  unresolvedGaps: TrainingGap[];
  excludedOpportunities: ExcludedOpportunity[];
  totals: RoadmapTotals;
  reasons: string[];
}

export interface BuildRoadmapOptions {
  now?: () => Date;
}

/** Inputs for `deriveGaps`, staying close to the ticket #8 solver contracts. */
export interface DeriveGapsInput {
  candidate: SolverCandidate;
  vacancy: SolverVacancy;
}
