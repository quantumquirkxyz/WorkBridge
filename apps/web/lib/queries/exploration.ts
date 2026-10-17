import { useMutation } from '@tanstack/react-query';
import { exploreVacancies } from '../api/client';
import type { PreferencesDraft } from '../preferences';

export function useExploreVacancies() {
  return useMutation({
    mutationFn: (preferences: PreferencesDraft) => exploreVacancies(preferences),
  });
}
