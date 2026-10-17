import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiClientError } from '../api/errors';
import {
  declineInterview,
  listPendingSubmissions,
  passToInterview,
  readEmployerSubmission,
  type EmployerSubmissionDetail,
} from '../api/employer';

export const pendingSubmissionsQueryKey = ['employer', 'submissions', 'pending'] as const;
export const employerSubmissionQueryKey = (submissionId: string) => ['employer', 'submission', submissionId] as const;

export function usePendingSubmissions() {
  return useQuery({ queryKey: pendingSubmissionsQueryKey, queryFn: listPendingSubmissions });
}

export function useEmployerSubmission(submissionId: string) {
  return useQuery({
    queryKey: employerSubmissionQueryKey(submissionId),
    queryFn: () => readEmployerSubmission(submissionId),
    retry: (count, error) => count < 2 && !(error instanceof ApiClientError && [403, 404].includes(error.apiError.status)),
  });
}

export type InterviewAction = { kind: 'pass' | 'decline'; reason: string };

export function useInterviewDecision(submission: EmployerSubmissionDetail | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ kind, reason }: InterviewAction) => {
      if (!submission) throw new Error('La postulación aún no está cargada.');
      return kind === 'pass' ? passToInterview(submission, reason) : declineInterview(submission, reason);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: pendingSubmissionsQueryKey });
      if (submission) void queryClient.invalidateQueries({ queryKey: employerSubmissionQueryKey(submission.submissionId) });
    },
  });
}
