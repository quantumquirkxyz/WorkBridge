import {
  heuristicProfileExtractor,
  type ExtractionInput,
  type ExtractionOutcome,
  type ProfileExtractor,
} from './heuristic';

export interface ResilientExtractorOptions {
  /** Preferred extractor, e.g. the LLM. */
  primary: ProfileExtractor;
  /** Deterministic extractor used when the primary fails. */
  fallback?: ProfileExtractor;
  onFallback?: (error: unknown) => void;
}

/**
 * Wrap a primary extractor with the deterministic heuristic as a guaranteed
 * fallback. The strategy that actually ran is reported per call, so a fallback
 * is never misreported as an LLM success — even under concurrent calls.
 */
export function createResilientExtractor(options: ResilientExtractorOptions): ProfileExtractor {
  const fallback = options.fallback ?? heuristicProfileExtractor;
  return {
    kind: options.primary.kind,
    async extract(input: ExtractionInput): Promise<ExtractionOutcome> {
      try {
        const outcome = await options.primary.extract(input);
        return { draft: outcome.draft, kind: outcome.kind };
      } catch (error) {
        options.onFallback?.(error);
        const outcome = await fallback.extract(input);
        return { draft: outcome.draft, kind: 'heuristic-fallback' };
      }
    },
  };
}
