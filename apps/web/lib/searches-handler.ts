import { makeId, validateCandidatePreferences } from '@puente/domain';
import type { ExplorationResult } from '@puente/catalog';
import { buildPreferences, type PreferencesDraft } from './preferences';
import { MAX_CANDIDATE_ID_LENGTH } from './exploration-handler';
import { preferencesStore, type PreferencesStore } from './preferences-store';
import { resolveExplorationAgent, type ExplorationSeamDeps } from './exploration-seam';
import type { HandlerResult } from './handler-result';
import { vacancyVisitsStore, type VacancyVisitsStore } from './vacancy-visits-store';
import {
  savedSearchesStore,
  type SavedSearch,
  type SavedSearchesStore,
  type SavedSearchView,
} from './saved-searches-store';

export interface SearchesHandlerDeps extends ExplorationSeamDeps {
  preferencesStore?: PreferencesStore;
  searchesStore?: SavedSearchesStore;
  visitsStore?: VacancyVisitsStore;
}

export interface SaveSearchPayload {
  label?: unknown;
  preferences?: unknown;
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
  const result = await resolveExplorationAgent(deps).run(preferences);

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
  if (!candidateId || candidateId.length > MAX_CANDIDATE_ID_LENGTH) {
    return { status: 400, body: { error: 'invalid_candidate_id' } };
  }
  const searches = (deps.searchesStore ?? savedSearchesStore).list(candidateId);
  const visits = deps.visitsStore ?? vacancyVisitsStore;
  const lastVisitAt = visits.get(candidateId);
  const agent = resolveExplorationAgent(deps);
  const views: SavedSearchView[] = [];
  for (const search of searches) {
    const result: ExplorationResult = await agent.run(search.preferences);
    const seen = new Set(search.seenJobIds);
    views.push({
      search,
      matches: result.matches,
      newSinceSaved: result.matches.filter((match) => !seen.has(match.vacancy.jobId)),
      newSinceLastVisit: result.matches.filter((match) => {
        if (!lastVisitAt) return false;
        return new Date(match.vacancy.postedAt).getTime() > new Date(lastVisitAt).getTime();
      }),
      lastVisitAt,
      summary: result.summary,
    });
  }
  return { status: 200, body: { searches: views } };
}

export function handleMarkVacancyVisit(candidateId: string, deps: SearchesHandlerDeps = {}): HandlerResult {
  if (!candidateId || candidateId.length > MAX_CANDIDATE_ID_LENGTH) {
    return { status: 400, body: { error: 'invalid_candidate_id' } };
  }
  (deps.visitsStore ?? vacancyVisitsStore).mark(candidateId, (deps.now ?? (() => new Date()))().toISOString());
  return { status: 204, body: null };
}
