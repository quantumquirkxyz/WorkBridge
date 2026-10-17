import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  approveDraft,
  correctDraft,
  createDraftFromMatch,
  getDraft,
  listMyDrafts,
  rejectDraft,
  submitDraft,
  type CreateDraftInput,
} from './applications-client';
import type { DraftView } from './applications-status';

export const myDraftsKey = ['applications', 'mine'] as const;
export const myDraftKey = (draftId: string) => ['applications', draftId] as const;

export function useMyDrafts() {
  return useQuery({ queryKey: myDraftsKey, queryFn: listMyDrafts });
}

export function useMyDraft(draftId: string) {
  return useQuery({ queryKey: myDraftKey(draftId), queryFn: () => getDraft(draftId) });
}

export function useCreateDraft() {
  return useMutation({
    mutationFn: async (input: CreateDraftInput) => {
      // Re-opening "Preparar mi postulación" must not pile up duplicate drafts.
      const existing = (await listMyDrafts()).find((draft) => draft.vacancyId === input.vacancyId && draft.status === 'open');
      if (existing) return existing;
      const created = await createDraftFromMatch(input);
      return created.draft;
    },
  });
}

export function useDraftActions(draft: Pick<DraftView, 'draftId' | 'traceId'>) {
  const queryClient = useQueryClient();
  const refresh = (updated: DraftView) => {
    queryClient.setQueryData(myDraftKey(draft.draftId), updated);
    void queryClient.invalidateQueries({ queryKey: myDraftsKey });
  };
  return {
    correct: useMutation({ mutationFn: (ids: string[]) => correctDraft(draft, ids), onSuccess: refresh }),
    approve: useMutation({ mutationFn: () => approveDraft(draft), onSuccess: refresh }),
    reject: useMutation({ mutationFn: (reason: string) => rejectDraft(draft, reason), onSuccess: refresh }),
    submit: useMutation({
      mutationFn: (idempotencyKey: string) => submitDraft(draft, idempotencyKey),
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: myDraftKey(draft.draftId) });
        void queryClient.invalidateQueries({ queryKey: myDraftsKey });
      },
    }),
  };
}
