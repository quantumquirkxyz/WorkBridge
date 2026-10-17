import { useMutation } from '@tanstack/react-query';
import { matchVacancies } from '../api/client';

export function useMatchVacancies() {
  return useMutation({ mutationFn: (vacancyIds: string[]) => matchVacancies(vacancyIds) });
}
