import type {
  CandidatePreferences,
  ContractType,
  PreferenceLocation,
  WorkModality,
} from '@puente/domain';

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

export interface VacancyMatch {
  vacancy: CachedVacancy;
  freshness: Freshness;
  provenance: VacancyProvenance;
  /** Deterministic 0–100 compatibility score. */
  matchScore: number;
  /** Spanish, dashboard-ready reasons. */
  matchReasons: string[];
}

export interface ExcludedVacancy {
  jobId: string;
  reason: ExclusionReason;
  /** Spanish, dashboard-ready explanation. */
  detail: string;
  freshness: Freshness;
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
  noMatch?: { explanation: string; nearMatches: ExcludedVacancy[]; roadmapRequested: boolean };
}

export interface CatalogOptions {
  now?: () => Date;
  /** Age beyond which a vacancy is excluded from automatic recommendation. */
  maxAgeHours?: number;
}

export interface ExplorationQueryOptions extends CatalogOptions {
  /** Maximum number of matches to return, newest and best first. */
  limit?: number;
}

export type { CandidatePreferences, ContractType, PreferenceLocation, WorkModality };
