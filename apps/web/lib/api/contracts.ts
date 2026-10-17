import type { CandidatePreferences, ExplorationResult } from '@workbridge/catalog';

/** Persisted saved search returned by POST /api/searches. */
export interface SavedSearch {
  searchId: string;
  candidateId: string;
  label: string;
  savedAt: string;
  preferences: CandidatePreferences;
  seenJobIds: string[];
}

/** Saved search with a fresh exploration run for listing in the UI. */
export interface SavedSearchView {
  search: SavedSearch;
  matches: ExplorationResult['matches'];
  newSinceSaved: ExplorationResult['matches'];
  newSinceLastVisit: ExplorationResult['matches'];
  summary: ExplorationResult['summary'];
}
