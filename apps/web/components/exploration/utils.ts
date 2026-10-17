export function timeToMinutes(value: string): number {
  const [hours = '0', minutes = '0'] = value.split(':');
  return Number(hours) * 60 + Number(minutes);
}

export function money(value: number | null): string {
  return value === null ? 'No publica' : `USD ${value}`;
}

export function toggleListValue<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

/** Preserve exploration order while solver decisions are still loading. */
export function orderMatchesByDecision(
  matches: VacancyMatch[],
  decisions: MatchDecision[],
  decisionsLoading: boolean,
): VacancyMatch[] {
  if (decisionsLoading) return matches;
  return [...matches].sort(
    (a, b) =>
      (decisions.find((decision) => decision.vacancyId === b.vacancy.jobId)?.score ?? -1) -
      (decisions.find((decision) => decision.vacancyId === a.vacancy.jobId)?.score ?? -1),
  );
}
import type { VacancyMatch } from '@puente/catalog';
import type { MatchDecision } from '@puente/solver';
