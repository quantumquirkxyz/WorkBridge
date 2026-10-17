import type { CandidateProfile } from '@workbridge/domain';

/** Persistence seam for validated candidate profiles. */
export interface ProfileStore {
  save(profile: CandidateProfile): void;
  get(candidateId: string): CandidateProfile | undefined;
  delete(candidateId: string): boolean;
}

/** In-process JSON-document store; a database adapter can replace this seam. */
export function createInMemoryProfileStore(): ProfileStore {
  const byCandidate = new Map<string, CandidateProfile>();
  return {
    save(profile) {
      byCandidate.set(profile.candidate_id, structuredClone(profile));
    },
    get(candidateId) {
      const profile = byCandidate.get(candidateId);
      return profile ? structuredClone(profile) : undefined;
    },
    delete(candidateId) {
      return byCandidate.delete(candidateId);
    },
  };
}

export const profileStore = createInMemoryProfileStore();
