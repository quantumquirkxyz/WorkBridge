import {
  MIN_EXPERIENCE_DESCRIPTION_CHARS,
  RELEVANCE_THRESHOLDS,
  normalizeTerm,
  relevantSkillIds,
  type ExperienceType,
  type Relevance,
  type RoleDefinition,
} from '@puente/domain';

export interface ClassificationInput {
  description: string;
  experienceType: ExperienceType;
  roles: readonly RoleDefinition[];
  /** Canonical skill ids detected in the experience text. */
  skillIds: readonly string[];
}

export interface Classification {
  relevance: Relevance;
  score: number;
  reason: string;
}

const MAX_POINTS = 3;

/**
 * Deterministic relevance scoring. The LLM may propose a classification, but
 * this function is the authority: it only depends on the description text, the
 * detected canonical skills, and the resolved target roles.
 */
export function classifyExperience(input: ClassificationInput): Classification {
  const description = input.description.trim();
  if (normalizeTerm(description).length < MIN_EXPERIENCE_DESCRIPTION_CHARS) {
    return {
      relevance: 'requires_additional_evidence',
      score: 0,
      reason: 'The description is too short to classify; ask the candidate for more detail or evidence.',
    };
  }

  const relevant = relevantSkillIds(input.roles);
  const matched = [...new Set(input.skillIds)].filter((id) =>
    relevant.size === 0 ? true : relevant.has(id),
  );

  if (matched.length === 0) {
    return {
      relevance: 'not_relevant',
      score: 0,
      reason:
        input.roles.length === 0
          ? 'No recognizable skills were found in the description.'
          : `No overlap with the target roles (${input.roles.map((role) => role.name).join(', ')}).`,
    };
  }

  const coverage = relevant.size === 0 ? Math.min(1, matched.length / MAX_POINTS) : matched.length / relevant.size;
  const skillDepth = Math.min(1, matched.length / MAX_POINTS);
  const score = Number((0.6 * coverage + 0.4 * skillDepth).toFixed(4));

  const relevance: Relevance =
    score >= RELEVANCE_THRESHOLDS.relevant
      ? 'relevant'
      : score >= RELEVANCE_THRESHOLDS.partial
        ? 'partially_relevant'
        : 'not_relevant';

  const roleLabel = input.roles.length ? input.roles.map((role) => role.name).join(', ') : 'the general catalog';
  const reason =
    relevance === 'not_relevant'
      ? `Only weak overlap with ${roleLabel}.`
      : `Matches ${matched.length} skill(s) relevant to ${roleLabel}.`;

  return { relevance, score, reason };
}
