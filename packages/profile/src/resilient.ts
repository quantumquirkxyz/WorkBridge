import type { ExtractorKind, ProfileDraft } from '@puente/domain';
import { heuristicProfileExtractor, type ExtractionInput, type ProfileExtractor } from './heuristic';

export interface ResilientExtractorOptions {
  /** Preferred extractor, e.g. the LLM. */
  primary: ProfileExtractor;
  /** Deterministic extractor used when the primary fails. */
  fallback?: ProfileExtractor;
  onFallback?: (error: unknown) => void;
}

/**
 * Wrap a primary extractor with the deterministic heuristic as a guaranteed
 * fallback. The returned extractor's `kind` getter reflects which strategy
 * actually ran, so a fallback is never misreported as an LLM success.
 */
export function createResilientExtractor(options: ResilientExtractorOptions): ProfileExtractor {
  const fallback = options.fallback ?? heuristicProfileExtractor;
  let lastKind: ExtractorKind = options.primary.kind;
  return {
    get kind(): ExtractorKind {
      return lastKind;
    },
    async extract(input: ExtractionInput): Promise<ProfileDraft> {
      try {
        const draft = await options.primary.extract(input);
        lastKind = options.primary.kind;
        return draft;
      } catch (error) {
        options.onFallback?.(error);
        lastKind = 'heuristic-fallback';
        return fallback.extract(input);
      }
    },
  };
}
