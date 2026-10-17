import type {
  CandidatePreferences,
  ContractType,
  PreferenceLocation,
  WorkModality,
} from '@workbridge/domain';

/**
 * The catalogue keeps the *raw* vacancy facts exactly as the scraper produced
 * them (jobUrl, jobId, query date, scrapingInfo) beside a normalized view. The
 * exploration seam only ever returns those preserved facts, plus a computed
 * freshness label, so nothing downstream has to guess how old a vacancy is.
 */

export type VacancyProvenanceSource = 'scraper' | 'manual' | 'seed';

export interface VacancySkill {
  /** Canonical taxonomy id, or `null` when the scraped wording could not be mapped. */
  skillId: string | null;
  labelEs: string;
  labelEn: string | null;
  required: boolean;
}

export interface VacancySalary {
  minUsd: number | null;
  maxUsd: number | null;
}

export interface VacancySchedule {
  /** ISO weekdays, 0 = Sunday … 6 = Saturday. */
  days: number[];
  startMinute: number;
  endMinute: number;
  weeklyHours: number;
}

export interface VacancyProvenance {
  provider: string;
  source: VacancyProvenanceSource;
  sourceUrl: string;
  retrievedAt: string;
}

/** The scraper's own bookkeeping, preserved verbatim through the catalogue. */
export interface ScrapingInfo {
  provider: string;
  query: string;
  scrapedAt: string;
  runId?: string | null;
  sourceJobId?: string | null;
  pageUrl?: string | null;
}

export interface CachedVacancy {
  schemaVersion: '1.0.0';
  jobId: string;
  jobUrl: string;
  title: string;
  company: string | null;
  location: PreferenceLocation;
  modality: WorkModality;
  contractType: ContractType;
  salary: VacancySalary;
  schedule: VacancySchedule;
  skills: VacancySkill[];
  postedAt: string;
  /** The date the vacancy was queried from the provider. */
  queriedAt: string;
  provenance: VacancyProvenance;
  scrapingInfo: ScrapingInfo;
}

export interface Freshness {
  ageHours: number;
  maxAgeHours: number;
  stale: boolean;
  /** Spanish, dashboard-ready label, e.g. `Publicada hace 3 h`. */
  label: string;
}

export type ExclusionReason =
  | 'stale'
  | 'modality'
  | 'location'
  | 'salary'
  | 'contract'
  | 'schedule';

/** A declared constraint a vacancy failed, with the exact reason it failed. */
export interface FailedConstraint {
  reason: ExclusionReason;
  /** Spanish, dashboard-ready explanation of this specific failure. */
  detail: string;
}

/**
 * The carrier shared by a match and a near match: the vacancy plus the two facts
 * every rendered result needs (how fresh it is, and where it came from). Keeping
 * one carrier means the two shapes cannot drift apart.
 */
export interface FreshnessAnnotated {
  vacancy: CachedVacancy;
  freshness: Freshness;
  provenance: VacancyProvenance;
}

export interface VacancyMatch extends FreshnessAnnotated {
  /** Deterministic 0–100 compatibility score. */
  matchScore: number;
  /** Spanish, dashboard-ready reasons. */
  matchReasons: string[];
}

export interface ExcludedVacancy {
  jobId: string;
  /** The highest-priority failed constraint; always `failedConstraints[0].reason`. */
  reason: ExclusionReason;
  /** Spanish, dashboard-ready explanation of `reason`. */
  detail: string;
  /**
   * Every declared constraint the vacancy failed, in priority order, each with
   * its own explanation. The full list lets a caller distinguish a vacancy
   * blocked by a single constraint (a *near* match) from one that fails several
   * at once, and lets the no-match breakdown name *every* blocking cause rather
   * than only the primary one.
   */
  failedConstraints: FailedConstraint[];
  freshness: Freshness;
}

/**
 * A vacancy that satisfies every declared constraint except one. It is still a
 * hard exclusion — hard constraints are never relaxed — but it is worth showing
 * with an explicit warning so the candidate can decide whether to widen the one
 * constraint that blocked it.
 */
export interface NearMatch extends FreshnessAnnotated {
  /** The single declared constraint that blocked this vacancy. */
  blockedBy: ExclusionReason;
  /** Spanish warning naming the constraint and why it blocked the vacancy. */
  warnings: string[];
  /** Deterministic 0–100 closeness score; higher means closer to compatible. */
  proximity: number;
}

/** Per-cause breakdown of a no-match result. */
export interface NoMatchCause {
  reason: ExclusionReason;
  count: number;
  /** Spanish, dashboard-ready explanation for this cause. */
  detail: string;
}

export interface NoMatch {
  explanation: string;
  /**
   * One entry per declared constraint that blocked at least one vacancy, with an
   * explicit count of the vacancies that failed it. A vacancy that failed several
   * constraints contributes to several causes, so every stated cause is surfaced
   * instead of only each vacancy's primary reason.
   */
  causes: NoMatchCause[];
  /** Vacancies blocked by exactly one constraint, closest first. */
  nearMatches: NearMatch[];
  /** True when the candidate declared willingness to train (a roadmap may be built). */
  roadmapRequested: boolean;
}

export interface ExplorationSummary {
  considered: number;
  matched: number;
  excluded: number;
  stale: number;
}

export interface ExplorationResult {
  schemaVersion: '1.0.0';
  candidateId: string;
  generatedAt: string;
  preferences: CandidatePreferences;
  matches: VacancyMatch[];
  excluded: ExcludedVacancy[];
  summary: ExplorationSummary;
  /** Present only when the exploration found no viable match (T-E: not when `limit` truncates). */
  noMatch?: NoMatch;
}

export interface CatalogOptions {
  now?: () => Date;
  /** Age beyond which a vacancy is excluded from automatic recommendation. */
  maxAgeHours?: number;
}

export interface ExplorationQueryOptions extends CatalogOptions {
  /** Maximum number of matches to return, newest and best first. */
  limit?: number;
  /**
   * Maximum number of near matches (vacancies blocked by exactly one declared
   * constraint) to return. Defaults to `DEFAULT_NEAR_MATCH_LIMIT`.
   */
  nearMatchLimit?: number;
}

export type { CandidatePreferences, ContractType, PreferenceLocation, WorkModality };
