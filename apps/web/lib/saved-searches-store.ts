import type { CandidatePreferences, ExplorationResult } from '@puente/catalog';

/**
 * A saved search. It persists the exact validated preferences the candidate
 * declared, plus the vacancy ids that were visible when it was saved, so a later
 * view can mark which matches are new.
 */
export interface SavedSearch {
  searchId: string;
  candidateId: string;
  label: string;
  savedAt: string;
  preferences: CandidatePreferences;
  /** Vacancy ids already surfaced when the search was saved. */
  seenJobIds: string[];
}

/** A saved search together with its current matches and the ones that are new. */
export interface SavedSearchView {
  search: SavedSearch;
  matches: ExplorationResult['matches'];
  /** Matches not present in `seenJobIds` — vacancies that appeared after saving. */
  newSinceSaved: ExplorationResult['matches'];
  newSinceLastVisit: ExplorationResult['matches'];
  lastVisitAt?: string;
  summary: ExplorationResult['summary'];
}

/** Persistence seam for saved searches, mirroring `PreferencesStore`. */
export interface SavedSearchesStore {
  save(search: SavedSearch): void;
  get(searchId: string): SavedSearch | undefined;
  list(candidateId?: string): SavedSearch[];
  /** Remove every saved search for a candidate; returns how many were removed. */
  deleteByCandidate(candidateId: string): number;
}

/** In-process store; a durable store can replace it behind the same interface. */
export function createInMemorySavedSearchesStore(): SavedSearchesStore {
  const byId = new Map<string, SavedSearch>();
  return {
    save(search) {
      byId.set(search.searchId, search);
    },
    get(searchId) {
      return byId.get(searchId);
    },
    list(candidateId) {
      const all = [...byId.values()];
      const filtered = candidateId ? all.filter((search) => search.candidateId === candidateId) : all;
      return filtered.sort((a, b) => (a.searchId < b.searchId ? -1 : a.searchId > b.searchId ? 1 : 0));
    },
    deleteByCandidate(candidateId) {
      let removed = 0;
      for (const [id, search] of byId) {
        if (search.candidateId === candidateId) {
          byId.delete(id);
          removed += 1;
        }
      }
      return removed;
    },
  };
}

/** Default store shared by the saved-search API routes and candidate deletion. */
export const savedSearchesStore = createInMemorySavedSearchesStore();
