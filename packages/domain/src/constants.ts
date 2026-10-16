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

/** Default confidence for a fact at each provenance level. */
export const CONFIDENCE_BY_PROVENANCE: Record<Provenance, number> = {
  verified: 0.95,
  extracted: 0.75,
  inferred: 0.5,
  declared: 0.55,
};

/** Floor for a confidence derived from evidence. */
export const MIN_CONFIDENCE = 0.3;

/** Fallback experience confidence when no relevance score is available. */
export const DEFAULT_EXPERIENCE_CONFIDENCE = 0.5;

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
