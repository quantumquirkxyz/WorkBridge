import type { Provenance, SkillLevel } from './types';

/** Ordinal strength of provenance, used to pick the strongest source for a fact. */
export const PROVENANCE_RANK: Record<Provenance, number> = {
  declared: 0,
  inferred: 1,
  extracted: 2,
  verified: 3,
};

/** Provenance levels strong enough to justify a skill above level 1. */
export const LEVEL_BEYOND_BASIC_PROVENANCE: readonly Provenance[] = ['extracted', 'verified'];

/** Highest level a declared-only skill may keep. */
export const DECLARED_ONLY_MAX_LEVEL: SkillLevel = 1;

export const SKILL_LEVEL_MIN = 0;
export const SKILL_LEVEL_MAX = 4;

/** Deterministic relevance thresholds over the keyword-overlap score. */
export const RELEVANCE_THRESHOLDS = {
  relevant: 0.5,
  partial: 0.2,
} as const;

export const DEFAULT_LOCALE = 'es-PA';
export const PROFILE_SCHEMA_VERSION = '1.0.0' as const;

/** Minimum description length before an experience can be scored at all. */
export const MIN_EXPERIENCE_DESCRIPTION_CHARS = 25;
