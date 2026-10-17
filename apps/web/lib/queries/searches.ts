import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listSavedSearches, saveSearch, type SaveSearchPayload } from '../api/client';

export const searchesQueryKey = (candidateId: string) => ['searches', candidateId] as const;

export function useSavedSearches(candidateId: string | undefined) {
  return useQuery({
    queryKey: searchesQueryKey(candidateId ?? ''),
    queryFn: () => listSavedSearches(candidateId!),
    enabled: Boolean(candidateId),
  });
}

export function useSaveSearchMutation(candidateId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SaveSearchPayload) => saveSearch(payload),
    onSuccess: () => {
      if (candidateId) {
        void queryClient.invalidateQueries({ queryKey: searchesQueryKey(candidateId) });
      }
    },
  });
}
