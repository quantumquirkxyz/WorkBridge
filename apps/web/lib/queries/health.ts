import { useQuery } from '@tanstack/react-query';
import { checkDbHealth } from '../api/client';

export function useDbHealth(enabled = false) {
  return useQuery({
    queryKey: ['health', 'db'],
    queryFn: () => checkDbHealth(),
    enabled,
  });
}
