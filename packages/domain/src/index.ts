
export * from './constants';
export * from './ids';
export * from './types';
export * from './validators';
export {
  SKILL_TAXONOMY,
  TAXONOMY_BY_ID,
  matchMentions,
  matchSkill as profileMatchSkill,
  normalizeTerm,
  type SkillDefinition,
  type TermMatch,
} from './taxonomy/skills';
export * from './taxonomy/roles';

export type {
  ActorRole,
  AgentEnvelope,
  AgentId,
  Alert,
  AlertClassification,
  AlertDisposition,
  AlertResolution,
  CanonicalSkill,
  DeclaredCredentialClaim,
  EnvelopeKind,
  JobRequirements,
  JobRequirementsMetadata,
  Location,
  MatchStrategy,
  Requirement,
  RequirementCategory,
  RequirementKind,
  ReviewItem,
  VacancySource,
  VacancyStatus,
  WorkflowRunRequest,
} from "./types";

export {
  PANAMA_SKILL_TAXONOMY,
  matchVacancySkill,
  normalizeText,
  type SkillTaxonomy,
  type TaxonomySkill,
} from "./taxonomy";

import { matchVacancySkill } from './taxonomy';
import { matchSkill as matchProfileSkill } from './taxonomy/skills';
import type { CanonicalSkill } from './types';
import type { SkillDefinition } from './taxonomy/skills';

export function matchSkill(text: string): CanonicalSkill & { skill: SkillDefinition } {
  const canonical = matchVacancySkill(text);
  const legacy = matchProfileSkill(text)?.skill;
  return {
    ...canonical,
    skill: legacy ?? {
      skill_id: canonical.skillId ?? '',
      canonical_name: canonical.labelEn ?? canonical.labelEs ?? '',
      kind: 'technical',
      synonyms: [],
    },
  };
}

export {
  AGENT_ENVELOPE_SCHEMA_ID,
  AjvValidationError,
  SCHEMA_ID,
  SCHEMA_VERSION,
  WORKFLOW_RUN_SCHEMA_ID,
  ajv,
  assertAgentEnvelope,
  assertJobRequirements,
  assertWorkflowRun,
  validateAgentEnvelope,
  validateJobRequirements,
  validateWorkflowRun,
  type AjvError,
} from "./ajv";
