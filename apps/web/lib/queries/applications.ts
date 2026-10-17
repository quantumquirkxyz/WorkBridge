import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  decideDraft,
  getCounselorDraft,
  listPendingCounselorDrafts,
  type CounselorDecision,
  type CounselorDraft,
} from '../api/applications';

export const pendingDraftsKey = ['counselor-drafts', 'pending'] as const;
export const counselorDraftKey = (draftId: string) => ['counselor-drafts', draftId] as const;

export function usePendingDrafts() {
  return useQuery({ queryKey: pendingDraftsKey, queryFn: listPendingCounselorDrafts });
}

export function useCounselorDraft(draftId: string) {
  return useQuery({ queryKey: counselorDraftKey(draftId), queryFn: () => getCounselorDraft(draftId) });
}

export function useDecideDraft(draft: Pick<CounselorDraft, 'draftId' | 'traceId'>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { decision: CounselorDecision; reason: string }) =>
      decideDraft(draft, input.decision, input.reason),
    onSuccess: (updated) => {
      queryClient.setQueryData(counselorDraftKey(draft.draftId), updated);
      void queryClient.invalidateQueries({ queryKey: pendingDraftsKey });
    },
  });
}
