import type { CandidatePreferences } from '@puente/domain';

/** Persistence seam for validated preferences. */
export interface PreferencesStore {
  save(preferences: CandidatePreferences): void;
  get(candidateId: string): CandidatePreferences | undefined;
  all(): CandidatePreferences[];
}

/**
 * In-process store. It keeps the latest validated preferences per candidate for
 * the lifetime of the server process; a durable store (PostgreSQL/Prisma per the
 * project stack) can replace it behind the same interface.
 */
export function createInMemoryPreferencesStore(): PreferencesStore {
  const byCandidate = new Map<string, CandidatePreferences>();
  return {
    save(preferences) {
      byCandidate.set(preferences.candidate_id, preferences);
    },
    get(candidateId) {
      return byCandidate.get(candidateId);
    },
    all() {
      return [...byCandidate.values()].sort((a, b) =>
        a.candidate_id < b.candidate_id ? -1 : a.candidate_id > b.candidate_id ? 1 : 0,
      );
    },
  };
}

/** Default store shared by the preferences and exploration API routes. */
export const preferencesStore = createInMemoryPreferencesStore();
