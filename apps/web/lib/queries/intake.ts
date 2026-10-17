import { useMutation, useQuery } from '@tanstack/react-query';
import type { IntakeRequest } from '@workbridge/domain';
import { getCandidateProfile, postIntake } from '../api/client';

export const intakeProfileQueryKey = (candidateId: string) => ['intake', 'profile', candidateId] as const;

export function useCandidateProfile(candidateId: string | undefined) {
  return useQuery({
    queryKey: intakeProfileQueryKey(candidateId ?? ''),
    queryFn: () => getCandidateProfile(candidateId!),
    enabled: Boolean(candidateId),
  });
}

export function usePostIntake() {
  return useMutation({
    mutationFn: (payload: IntakeRequest) => postIntake(payload),
  });
}
