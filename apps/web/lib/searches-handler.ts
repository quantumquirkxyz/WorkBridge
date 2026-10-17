import { makeId, validateCandidatePreferences } from '@puente/domain';
import { createSeedCatalog, type ExplorationResult, type VacancyCatalog } from '@puente/catalog';
import { createExplorationAgent, type ExplorationAgent } from '@puente/agent-runtime';
import { buildPreferences, type PreferencesDraft } from './preferences';
import { preferencesStore, type PreferencesStore } from './preferences-store';
import {
  savedSearchesStore,
  type SavedSearch,
  type SavedSearchesStore,
  type SavedSearchView,
} from './saved-searches-store';

export interface SearchesHandlerDeps {
  agent?: ExplorationAgent;
  catalog?: VacancyCatalog;
  preferencesStore?: PreferencesStore;
  searchesStore?: SavedSearchesStore;
  now?: () => Date;
}

export interface HandlerResult {
  status: number;
  body: unknown;
}

export interface SaveSearchPayload {
  label?: unknown;
  preferences?: unknown;
}

function explorationAgent(deps: SearchesHandlerDeps): ExplorationAgent {
  return (
    deps.agent ?? createExplorationAgent({ catalog: deps.catalog ?? createSeedCatalog(), now: deps.now })
  );
}

/**
 * Save a search: persist the explicitly declared preferences and record the
 * vacancy ids that are visible now. Future matches are whatever appears in a
 * later run that was not in that snapshot.
 */
export async function handleSaveSearch(
  payload: unknown,
  deps: SearchesHandlerDeps = {},
): Promise<HandlerResult> {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { status: 400, body: { error: 'invalid_search', details: ['El cuerpo debe ser un objeto.'] } };
  }
  const { label, preferences: draft } = payload as SaveSearchPayload;
  if (typeof label !== 'string' || label.trim().length === 0) {
    return { status: 400, body: { error: 'invalid_search', details: ['Falta la etiqueta de la búsqueda.'] } };
  }

  const preferences = buildPreferences((draft ?? {}) as PreferencesDraft, { now: deps.now });
  const validation = validateCandidatePreferences(preferences);
  if (!validation.valid) {
    return { status: 400, body: { error: 'invalid_preferences', details: validation.errors } };
  }

  (deps.preferencesStore ?? preferencesStore).save(preferences);
  const result = await explorationAgent(deps).run(preferences);

  const timestamp = (deps.now ?? (() => new Date()))().toISOString();
  const saved: SavedSearch = {
    searchId: makeId('search', `${preferences.candidate_id}|${label.trim()}`),
    candidateId: preferences.candidate_id,
    label: label.trim(),
    savedAt: timestamp,
    preferences,
    seenJobIds: result.matches.map((match) => match.vacancy.jobId).sort(),
  };
  (deps.searchesStore ?? savedSearchesStore).save(saved);
  return { status: 201, body: saved };
}

/** List a candidate's saved searches, each re-run against the catalogue. */
export async function handleListSearches(
  candidateId: string,
  deps: SearchesHandlerDeps = {},
): Promise<HandlerResult> {
  if (!candidateId || candidateId.length > 128) {
    return { status: 400, body: { error: 'invalid_candidate_id' } };
  }
  const searches = (deps.searchesStore ?? savedSearchesStore).list(candidateId);
  const agent = explorationAgent(deps);
  const views: SavedSearchView[] = [];
  for (const search of searches) {
    const result: ExplorationResult = await agent.run(search.preferences);
    const seen = new Set(search.seenJobIds);
    views.push({
      search,
      matches: result.matches,
      newSinceSaved: result.matches.filter((match) => !seen.has(match.vacancy.jobId)),
      summary: result.summary,
    });
  }
  return { status: 200, body: { searches: views } };
}
