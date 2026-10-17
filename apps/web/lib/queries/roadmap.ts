import { useMutation } from '@tanstack/react-query';
import type { ExplorationResult } from '@workbridge/catalog';
import { requestRoadmap } from '../api/client';

export function useRequestRoadmap() {
  return useMutation({
    mutationFn: (exploration: ExplorationResult) => requestRoadmap(exploration),
  });
}
