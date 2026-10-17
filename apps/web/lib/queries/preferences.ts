import { useMutation, useQuery } from '@tanstack/react-query';
import { deleteCandidatePreferences, getPreferences, postPreferences } from '../api/client';
import type { PreferencesDraft } from '../preferences';

export const preferencesQueryKey = (candidateId: string) => ['preferences', candidateId] as const;

export function useCandidatePreferences(candidateId: string | undefined) {
  return useQuery({
    queryKey: preferencesQueryKey(candidateId ?? ''),
    queryFn: () => getPreferences(candidateId!),
    enabled: Boolean(candidateId),
  });
}

export function useSavePreferences() {
  return useMutation({
    mutationFn: (draft: PreferencesDraft) => postPreferences(draft),
  });
}

export function useDeleteCandidateData() {
  return useMutation({
    mutationFn: (candidateId: string) => deleteCandidatePreferences(candidateId),
  });
}
