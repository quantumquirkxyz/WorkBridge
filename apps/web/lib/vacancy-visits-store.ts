/** Persistence seam for the candidate's last visit to /vacantes. */
export interface VacancyVisitsStore {
  get(candidateId: string): string | undefined;
  mark(candidateId: string, visitedAt: string): void;
}

export function createInMemoryVacancyVisitsStore(): VacancyVisitsStore {
  const visits = new Map<string, string>();
  return {
    get: (candidateId) => visits.get(candidateId),
    mark: (candidateId, visitedAt) => visits.set(candidateId, visitedAt),
  };
}

export const vacancyVisitsStore = createInMemoryVacancyVisitsStore();
