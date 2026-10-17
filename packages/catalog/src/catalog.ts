import { assertCachedVacancy } from './ajv';
import { InvalidVacancyError } from './errors';
import type {
  CachedVacancy,
  ContractType,
  PreferenceLocation,
  ScrapingInfo,
  VacancySalary,
  VacancySchedule,
  VacancySkill,
  WorkModality,
} from './types';

/**
 * A raw record as it arrives from a scraper (e.g. the Apify LinkedIn Jobs
 * actor) before normalization. `jobId`, `jobUrl`, `queriedAt`, and
 * `scrapingInfo` are carried through unchanged.
 */
export interface RawScrapedVacancy {
  jobId: string;
  jobUrl: string;
  title: string;
  company?: string | null;
  postedAt: string;
  queriedAt?: string;
  scrapingInfo: ScrapingInfo;
  location?: Partial<PreferenceLocation> | string | null;
  modality?: WorkModality;
  contractType?: ContractType;
  salary?: Partial<VacancySalary>;
  schedule?: Partial<VacancySchedule>;
  skills?: Array<VacancySkill | string>;
}

const DEFAULT_LOCATION: PreferenceLocation = { country: 'PA', province: null, district: null, raw: null };

function normalizeLocation(value: RawScrapedVacancy['location']): PreferenceLocation {
  if (!value) return DEFAULT_LOCATION;
  if (typeof value === 'string') return { ...DEFAULT_LOCATION, raw: value };
  return {
    country: value.country ?? DEFAULT_LOCATION.country,
    province: value.province ?? null,
    district: value.district ?? null,
    raw: value.raw ?? null,
  };
}

function normalizeSkills(skills: RawScrapedVacancy['skills']): VacancySkill[] {
  if (!skills) return [];
  return skills.map((skill) =>
    typeof skill === 'string'
      ? { skillId: null, labelEs: skill, labelEn: null, required: true }
      : skill,
  );
}

/**
 * Normalize one scraped record into a `CachedVacancy` while preserving the
 * provenance-bearing scraped facts. The result is Ajv-validated before it can
 * enter the catalogue.
 */
export function toCachedVacancy(
  raw: RawScrapedVacancy,
  { now = () => new Date() }: { now?: () => Date } = {},
): CachedVacancy {
  const queriedAt = raw.queriedAt ?? now().toISOString();
  const vacancy: CachedVacancy = {
    schemaVersion: '1.0.0',
    jobId: raw.jobId,
    jobUrl: raw.jobUrl,
    title: raw.title,
    company: raw.company ?? null,
    location: normalizeLocation(raw.location),
    modality: raw.modality ?? 'onsite',
    contractType: raw.contractType ?? 'full_time',
    salary: { minUsd: raw.salary?.minUsd ?? null, maxUsd: raw.salary?.maxUsd ?? null },
    schedule: {
      days: raw.schedule?.days ?? [1, 2, 3, 4, 5],
      startMinute: raw.schedule?.startMinute ?? 480,
      endMinute: raw.schedule?.endMinute ?? 1020,
      weeklyHours: raw.schedule?.weeklyHours ?? 40,
    },
    skills: normalizeSkills(raw.skills),
    postedAt: raw.postedAt,
    queriedAt,
    provenance: {
      provider: raw.scrapingInfo.provider,
      source: 'scraper',
      sourceUrl: raw.jobUrl,
      retrievedAt: queriedAt,
    },
    scrapingInfo: raw.scrapingInfo,
  };
  assertCachedVacancy(vacancy);
  return vacancy;
}

export interface VacancyCatalog {
  /** Every cached vacancy, newest first, deduplicated by jobId. */
  all(): CachedVacancy[];
  get(jobId: string): CachedVacancy | undefined;
  size(): number;
}

/**
 * Build an in-memory, deterministic catalogue. Records are validated against
 * the CachedVacancy contract; duplicates of the same `jobId` are collapsed to
 * the one with the most recent `queriedAt`.
 */
export function createVacancyCatalog(records: readonly CachedVacancy[]): VacancyCatalog {
  const byId = new Map<string, CachedVacancy>();
  for (const record of records) {
    assertCachedVacancy(record);
    const existing = byId.get(record.jobId);
    if (!existing || record.queriedAt > existing.queriedAt) {
      byId.set(record.jobId, record);
    }
  }
  const ordered = [...byId.values()].sort((a, b) => {
    if (a.queriedAt !== b.queriedAt) return a.queriedAt < b.queriedAt ? 1 : -1;
    return a.jobId < b.jobId ? -1 : a.jobId > b.jobId ? 1 : 0;
  });
  return {
    all: () => ordered,
    get: (jobId: string) => byId.get(jobId),
    size: () => byId.size,
  };
}

/** Build a catalogue from a raw scraped JSON payload while preserving provenance. */
export function loadCatalogFromScraped(
  records: readonly RawScrapedVacancy[],
  options: { now?: () => Date } = {},
): VacancyCatalog {
  if (!Array.isArray(records)) {
    throw new InvalidVacancyError('Scraped catalogue payload must be an array of records.');
  }
  return createVacancyCatalog(records.map((record) => toCachedVacancy(record, options)));
}
