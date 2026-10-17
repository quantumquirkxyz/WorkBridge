import type { ExplorationResult } from '@workbridge/catalog';

/** Title of one vacancy inside an exploration result, or null when that result does not contain it. */
export function titleFromExploration(result: ExplorationResult | null | undefined, jobId: string): string | null {
  const title = result?.matches.find((entry) => entry.vacancy.jobId === jobId)?.vacancy.title?.trim();
  return title ? title : null;
}

/**
 * Resolve the title a new application needs. The catalog wins, then the exploration
 * saved in localStorage, then the session copy used by the training route.
 */
export function resolveVacancyTitle(
  jobId: string,
  sources: {
    catalogTitle?: string | null;
    storedExploration?: ExplorationResult | null;
    sessionExploration?: ExplorationResult | null;
  },
): string | null {
  const catalog = sources.catalogTitle?.trim();
  if (catalog) return catalog;
  return titleFromExploration(sources.storedExploration, jobId) ?? titleFromExploration(sources.sessionExploration, jobId);
}
