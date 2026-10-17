import { assertCandidatePreferences } from '@puente/domain';
import {
  exploreVacancies,
  type ExplorationQueryOptions,
  type ExplorationResult,
  type VacancyCatalog,
} from '@puente/catalog';

/**
 * The Exploration Agent seam (spec #1). It is deliberately thin and
 * deterministic: it validates the *explicitly captured* candidate preferences
 * against the contract and queries the cached vacancy catalogue. Preferences
 * never pass through a model here, so they cannot be inferred.
 */
export interface ExplorationAgent {
  run(preferences: unknown, options?: ExplorationQueryOptions): Promise<ExplorationResult>;
}

export interface ExplorationAgentDeps {
  catalog: VacancyCatalog;
  now?: () => Date;
}

export function createExplorationAgent({ catalog, now }: ExplorationAgentDeps): ExplorationAgent {
  return {
    async run(preferences: unknown, options: ExplorationQueryOptions = {}): Promise<ExplorationResult> {
      assertCandidatePreferences(preferences);
      return exploreVacancies(preferences, catalog, { now, ...options });
    },
  };
}
