
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
  Alert,
  AlertClassification,
  AlertDisposition,
  AlertResolution,
  CanonicalSkill,
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
  AjvValidationError,
  SCHEMA_ID,
  SCHEMA_VERSION,
  ajv,
  assertJobRequirements,
  validateJobRequirements,
  type AjvError,
} from "./ajv";

export {
  APTITUDE_THRESHOLDS,
  AUDIT_EVENT_SCHEMA_ID,
  MATCH_DECISION_SCHEMA_ID,
  MATCH_WEIGHTS,
  WORKFLOW_ENVELOPE_SCHEMA_ID,
  aptitudeForWeightedTotal,
  assertAuditEvent,
  assertMatchDecision,
  assertWorkflowEnvelope,
  validateAuditEvent,
  validateMatchDecision,
  validateWorkflowEnvelope,
  type Aptitude,
  type AuditAction,
  type AuditEvent,
  type AuditRole,
  type ConstraintResult,
  type DqlState,
  type GapSeverity,
  type GuardrailCode,
  type GuardrailStage,
  type GuardrailVerdict,
  type MatchDecision,
  type RoutingSource,
  type ScoreBreakdown,
  type SolverStrategy,
  type WorkflowAgent,
  type WorkflowEnvelope,
} from "./assumed";
