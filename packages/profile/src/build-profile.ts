import type { IntakeResult, IntakeSource, IntakeSourceKind, Provenance } from '@puente/domain';
import { heuristicProfileExtractor, type ProfileExtractor } from './heuristic';
import { normalizeProfileDraft } from './normalize';

export interface BuildProfileInput {
  text: string;
  source: IntakeSource;
  provenance: Provenance;
  traceId: string;
  targetRoles?: string[];
  candidateId?: string;
  locale?: string;
  warnings?: string[];
}

export interface BuildProfileDeps {
  extractor?: ProfileExtractor;
  now?: () => Date;
}

/**
 * Provenance assigned to facts taken from a given intake kind. A PDF or image is
 * "extracted"; pasted text or a pre-transcribed audio description is "declared"
 * by the candidate. This is what keeps declared-only skills at level 1.
 */
export function provenanceForIntakeKind(kind: IntakeSourceKind): Provenance {
  return kind === 'pdf' || kind === 'image' ? 'extracted' : 'declared';
}

/**
 * Deterministic profile build: extract a draft, then normalize and validate it
 * into a `CandidateProfile`. The extractor may be an LLM, but the resulting
 * profile always passes through the same deterministic rules.
 */
export async function buildProfile(
  input: BuildProfileInput,
  deps: BuildProfileDeps = {},
): Promise<IntakeResult> {
  const extractor = deps.extractor ?? heuristicProfileExtractor;
  const outcome = await extractor.extract({
    text: input.text,
    sourceRef: input.source.ref,
    provenance: input.provenance,
    targetRoles: input.targetRoles,
    locale: input.locale,
  });
  const draft = outcome.draft;

  const warnings = [...(input.warnings ?? []), ...(input.source.warnings ?? [])];
  const profile = normalizeProfileDraft(draft, {
    traceId: input.traceId,
    sources: [input.source],
    provenance: input.provenance,
    targetRoles: input.targetRoles,
    candidateId: input.candidateId,
    locale: input.locale,
    warnings,
    now: deps.now,
  });

  const needsReview =
    (profile.warnings?.length ?? 0) > 0 ||
    profile.experiences.some((experience) => experience.relevance === 'requires_additional_evidence') ||
    profile.skills.some((skill) => skill.level === 0);

  return {
    trace_id: input.traceId,
    profile,
    extraction: {
      extractor: outcome.kind,
      needs_review: needsReview,
      warnings: profile.warnings ?? [],
    },
  };
}
