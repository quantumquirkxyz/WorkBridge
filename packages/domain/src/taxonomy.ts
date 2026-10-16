import type { CanonicalSkill, MatchStrategy } from "./types";
import taxonomyData from "./taxonomy/panama-skills.taxonomy.json";

export interface TaxonomySkill {
  id: string;
  labelEs: string;
  labelEn: string;
  escoLabel: string;
  escoUri: string | null;
  kind: string;
  aliases: string[];
}

export interface SkillTaxonomy {
  version: string;
  source: string;
  provenance: string;
  skills: TaxonomySkill[];
}

export const PANAMA_SKILL_TAXONOMY = taxonomyData as unknown as SkillTaxonomy;

/** Qualifiers that describe a proficiency level, not the skill identity. */
const QUALIFIER_TOKENS = new Set([
  "nivel",
  "n0",
  "n1",
  "n2",
  "n3",
  "n4",
  "0",
  "1",
  "2",
  "3",
  "4",
  "basico",
  "basica",
  "intermedio",
  "intermedia",
  "avanzado",
  "avanzada",
  "experto",
  "experta",
  "principiante",
  "a1",
  "a2",
  "b1",
  "b2",
  "c1",
  "c2",
]);

/** Stop words that carry no skill signal in Spanish/English job ads. */
const STOP_WORDS = new Set([
  "de",
  "del",
  "la",
  "el",
  "los",
  "las",
  "un",
  "una",
  "unos",
  "unas",
  "y",
  "e",
  "o",
  "u",
  "en",
  "con",
  "a",
  "al",
  "para",
  "por",
  "the",
  "of",
  "and",
  "or",
  "in",
  "with",
  "to",
  "for",
]);

/**
 * Lowercase, strip diacritics, and collapse punctuation to single spaces.
 * Used for every taxonomy comparison and fairness rule match so that
 * "Atención al Cliente" and "atencion al cliente" are treated identically.
 */
export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function stripNoise(normalized: string): string {
  return normalized
    .split(" ")
    .filter((token) => token.length > 0)
    .filter((token) => !STOP_WORDS.has(token) && !QUALIFIER_TOKENS.has(token))
    .join(" ");
}

function tokens(normalized: string): Set<string> {
  return new Set(normalized.split(" ").filter(Boolean));
}

function tokenSetJaccard(a: string, b: string): number {
  const setA = tokens(a);
  const setB = tokens(b);
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection += 1;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/** 0.9 when one normalized phrase contains the other as a whole-word run. */
function phraseContainment(a: string, b: string): number {
  const shorter = a.length <= b.length ? a : b;
  const longer = a.length <= b.length ? b : a;
  if (shorter.length < 5) return 0;
  const paddedLonger = ` ${longer} `;
  return paddedLonger.includes(` ${shorter} `) ? 0.9 : 0;
}

function buildMatch(
  skill: TaxonomySkill,
  strategy: MatchStrategy,
  confidence: number,
  taxonomy: SkillTaxonomy,
): CanonicalSkill {
  return {
    matched: true,
    skillId: skill.id,
    labelEs: skill.labelEs,
    labelEn: skill.labelEn,
    escoLabel: skill.escoLabel,
    escoUri: skill.escoUri,
    taxonomyVersion: taxonomy.version,
    matchConfidence: Number(confidence.toFixed(2)),
    matchStrategy: strategy,
  };
}

function unmatched(taxonomy: SkillTaxonomy): CanonicalSkill {
  return {
    matched: false,
    skillId: null,
    labelEs: null,
    labelEn: null,
    escoLabel: null,
    escoUri: null,
    taxonomyVersion: taxonomy.version,
    matchConfidence: 0,
    matchStrategy: "none",
  };
}

const FUZZY_THRESHOLD = 0.8;

/**
 * Map free-text wording to a canonical taxonomy skill. Original wording is
 * never modified by this function; callers keep it alongside the match.
 */
export function matchSkill(
  text: string,
  taxonomy: SkillTaxonomy = PANAMA_SKILL_TAXONOMY,
): CanonicalSkill {
  const normalized = normalizeText(text);
  if (!normalized) return unmatched(taxonomy);
  const stripped = stripNoise(normalized);

  for (const skill of taxonomy.skills) {
    for (const label of [skill.labelEs, skill.labelEn]) {
      const normalizedLabel = normalizeText(label);
      if (normalizedLabel && (normalized === normalizedLabel || stripped === normalizedLabel)) {
        return buildMatch(skill, "exact", 1, taxonomy);
      }
    }
  }

  for (const skill of taxonomy.skills) {
    for (const alias of skill.aliases) {
      const normalizedAlias = normalizeText(alias);
      if (normalizedAlias && (normalized === normalizedAlias || stripped === normalizedAlias)) {
        return buildMatch(skill, "alias", 1, taxonomy);
      }
    }
  }

  let best: { skill: TaxonomySkill; confidence: number } | null = null;
  for (const skill of taxonomy.skills) {
    const candidates = [skill.labelEs, skill.labelEn, ...skill.aliases]
      .map(normalizeText)
      .map(stripNoise)
      .filter((candidate) => candidate.length > 0);
    for (const candidate of candidates) {
      const score = Math.max(
        tokenSetJaccard(stripped, candidate),
        phraseContainment(stripped, candidate),
      );
      if (score >= FUZZY_THRESHOLD && (best === null || score > best.confidence)) {
        best = { skill, confidence: score };
      }
    }
  }

  return best ? buildMatch(best.skill, "fuzzy", best.confidence, taxonomy) : unmatched(taxonomy);
}
