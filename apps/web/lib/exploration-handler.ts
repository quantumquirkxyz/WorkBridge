import { validateCandidatePreferences, type CandidatePreferences } from '@workbridge/domain';
import { buildPreferences, type PreferencesDraft } from './preferences';
import { preferencesStore, type PreferencesStore } from './preferences-store';
import { savedSearchesStore, type SavedSearchesStore } from './saved-searches-store';
import { resolveExplorationAgent, type ExplorationSeamDeps } from './exploration-seam';
import type { HandlerResult } from './handler-result';

export interface ExplorationHandlerDeps extends ExplorationSeamDeps {
  store?: PreferencesStore;
  /** Injected for tests; defaults to the shared saved-search store. */
  searchesStore?: SavedSearchesStore;
}

type Parsed =
  | { ok: true; preferences: CandidatePreferences }
  | { ok: false; result: HandlerResult };

function parsePreferences(payload: unknown, deps: ExplorationHandlerDeps): Parsed {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return {
      ok: false,
      result: { status: 400, body: { error: 'invalid_preferences', details: ['El cuerpo debe ser un objeto.'] } },
    };
  }

  const preferences = buildPreferences(payload as PreferencesDraft, { now: deps.now });
  const validation = validateCandidatePreferences(preferences);
  if (!validation.valid) {
    return { ok: false, result: { status: 400, body: { error: 'invalid_preferences', details: validation.errors } } };
  }
  return { ok: true, preferences };
}

/**
 * Validate and persist explicitly declared preferences. Preferences never pass
 * through a language model: they are mapped straight from the form payload onto
 * the CandidatePreferences contract and rejected if they do not conform.
 */
export function handleSavePreferences(
  payload: unknown,
  deps: ExplorationHandlerDeps = {},
): HandlerResult {
  const parsed = parsePreferences(payload, deps);
  if (!parsed.ok) return parsed.result;
  const store = deps.store ?? preferencesStore;
  store.save(parsed.preferences);
  return { status: 200, body: parsed.preferences };
}

/** Upper bound on a candidate id accepted by the deletion seam. Named, not magic. */
export const MAX_CANDIDATE_ID_LENGTH = 128;

/**
 * Delete every piece of candidate data this slice stores: the validated
 * preferences document and any saved searches for the same candidate. This is
 * the data-deletion seam for issue #10; it never touches a submission path.
 */
export function handleDeleteCandidate(candidateId: string, deps: ExplorationHandlerDeps = {}): HandlerResult {
  if (!candidateId || candidateId.length > MAX_CANDIDATE_ID_LENGTH) {
    return { status: 400, body: { error: 'invalid_candidate_id' } };
  }
  const preferencesDeleted = (deps.store ?? preferencesStore).delete(candidateId);
  const searchesDeleted = (deps.searchesStore ?? savedSearchesStore).deleteByCandidate(candidateId);
  const deleted = preferencesDeleted || searchesDeleted > 0;
  return {
    status: deleted ? 200 : 404,
    body: { deleted, candidateId, preferencesDeleted, searchesDeleted },
  };
}

/**
 * Persist preferences and query the cached vacancy catalogue for compatible
 * vacancies with provenance and freshness. No application is ever submitted.
 */
export async function handleExploration(
  payload: unknown,
  deps: ExplorationHandlerDeps = {},
): Promise<HandlerResult> {
  const parsed = parsePreferences(payload, deps);
  if (!parsed.ok) return parsed.result;

  const store = deps.store ?? preferencesStore;
  store.save(parsed.preferences);

  const agent = resolveExplorationAgent(deps);
  const result = await agent.run(parsed.preferences);
  return { status: 200, body: result };
}
