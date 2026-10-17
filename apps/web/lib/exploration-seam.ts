import { createSeedCatalog, type VacancyCatalog } from '@puente/catalog';
import { createExplorationAgent, type ExplorationAgent } from '@puente/agent-runtime';

/** The exploration seam every web handler shares. */
export interface ExplorationSeamDeps {
  agent?: ExplorationAgent;
  catalog?: VacancyCatalog;
  now?: () => Date;
}

/**
 * Resolve the Exploration Agent, honouring an injected agent/catalogue for tests
 * and defaulting to the bundled seed catalogue. Shared so the explore and
 * saved-search handlers construct the agent identically, and cannot drift.
 */
export function resolveExplorationAgent(deps: ExplorationSeamDeps): ExplorationAgent {
  return (
    deps.agent ?? createExplorationAgent({ catalog: deps.catalog ?? createSeedCatalog(), now: deps.now })
  );
}
