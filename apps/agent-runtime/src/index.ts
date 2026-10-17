
import { heuristicProfileExtractor, createResilientExtractor, type ProfileExtractor } from '@puente/profile';
import { createOpenRouterChat, createOpenRouterVision } from './llm/openrouter';
import { createLlmProfileExtractor } from './extractors/llm-extractor';
import { ProfileAgent } from './profile-agent';
import { visionOcrAdapter } from '@puente/ingestion';

export interface AgentRuntimeEnv {
  OPENROUTER_API_KEY?: string;
  OPENROUTER_MODEL?: string;
  OPENROUTER_VISION_MODEL?: string;
  OPENROUTER_BASE_URL?: string;
}

export interface CreateAgentFromEnvResult {
  agent: ProfileAgent;
  mode: 'llm' | 'heuristic';
  extractor: ProfileExtractor;
  warnings: string[];
}

/**
 * Build the Profile agent from environment variables.
 *
 * When `OPENROUTER_API_KEY` is present the agent uses an LLM extractor wrapped
 * in a resilient fallback; otherwise it uses the deterministic heuristic
 * extractor. Either way the produced profile is deterministic in shape and
 * schema-valid.
 */
export function createAgentFromEnv(env: AgentRuntimeEnv = {}): CreateAgentFromEnvResult {
  const warnings: string[] = [];
  if (!env.OPENROUTER_API_KEY) {
    warnings.push('OPENROUTER_API_KEY is not set; using the deterministic heuristic extractor.');
    return { agent: new ProfileAgent(), mode: 'heuristic', extractor: heuristicProfileExtractor, warnings };
  }

  const model = env.OPENROUTER_MODEL ?? 'openai/gpt-4o-mini';
  const chat = createOpenRouterChat({
    apiKey: env.OPENROUTER_API_KEY,
    model,
    baseUrl: env.OPENROUTER_BASE_URL,
  });
  const primary = createLlmProfileExtractor({ chat });
  const extractor = createResilientExtractor({
    primary,
    onFallback: (error) => {
      warnings.push(`LLM extraction failed and fell back to the heuristic extractor: ${String(error)}`);
    },
  });

  const ocr = env.OPENROUTER_VISION_MODEL
    ? visionOcrAdapter({
        describe: createOpenRouterVision({
          apiKey: env.OPENROUTER_API_KEY,
          model: env.OPENROUTER_VISION_MODEL,
          baseUrl: env.OPENROUTER_BASE_URL,
        }),
      })
    : undefined;

  return { agent: new ProfileAgent({ extractor, ocr }), mode: 'llm', extractor, warnings };
}

export * from './profile-agent';
export * from './llm/openrouter';
export * from './extractors/llm-extractor';
export * from './pii';
export * from './exploration/exploration-agent';

export type {
  ExtractedVacancy,
  NormalizeVacancyOptions,
  RawRequirement,
  RawRequirementInput,
  RawVacancy,
  ReviewDecision,
  TextExtractionResult,
  VacancyExtractionPort,
  VacancyInput,
} from "./vacancy/types";

export {
  ExtractionUnavailableError,
  InvalidJobRequirementsError,
  ReviewNotFoundError,
  VacancyInputError,
} from "./vacancy/errors";

export {
  FAIRNESS_RULES,
  FAIRNESS_RULES_VERSION,
  classifyRequirement,
  type FairnessClassification,
  type FairnessRule,
} from "./vacancy/fairness";

export {
  DEFAULT_LOCATION,
  extractJson,
  extractStructured,
  extractVacancy,
  normalizeLocation,
} from "./vacancy/extract";

export { normalizeVacancy, normalizeExtractedVacancy } from "./vacancy/normalize";

export {
  getExcludedRequirements,
  getPendingReviews,
  getRankableRequirements,
  isVacancyRankable,
  resolveReview,
} from "./vacancy/ranking";

export {
  defaultImageExtractor,
  defaultPdfExtractor,
} from "./vacancy/extract/adapters";

export { inferKind, parseLevel, parseVacancyText, slugify } from "./vacancy/text";

export {
  DEFAULT_GEO_POINT,
  MatchingInputError,
  MatchingService,
  createGeocodingPort,
  createGoogleGeocoder,
  createLocalGeocoder,
  createMatchingService,
  canonicalSkillId,
  deriveExperienceLevel,
  matchingConfigFromEnv,
  toSolverCandidate,
  toSolverVacancy,
  toApplicationMatchDecision,
  GeocodingUnavailableError,
  PANAMA_LOCATIONS,
  type CandidateMatchContext,
  type ApplicationDecisionProjectionOptions,
  type CandidateNominationInput,
  type CandidateNominationResult,
  type GeocodeResult,
  type GeocodingPort,
  type MatchingEnv,
  type MatchingRuntimeConfig,
  type MatchingServiceDeps,
  type VacancyMatchContext,
  type VacancyMatchInput,
} from "./matching";

export { ApplicationService } from "./application/service";
export { createApplicationServer } from "./application/server";
export { BETTER_AUTH_ROLES, actorFromBetterAuthSession, signBetterAuthSession } from "./application/roles";
export type { BetterAuthSession } from "./application/roles";
export {
  toApplicationEvidence,
  type EvidenceItem,
  type CredentialStatus,
  type ProfileCredentialStatus,
} from "./application/evidence";

export { verificationConfigFromEnv, verifyCredential } from "./verification/index";

export {
  AGENT_CAPABILITIES,
  CAPABILITY_CHAINS,
  WORKFLOW_ID,
  createOpenRouterClient,
  createWorkflowRuntime,
  encodeSseEvent,
  handleWorkflowRequest,
  type WorkflowDependencies,
  type WorkflowResult,
} from "./workflow";
