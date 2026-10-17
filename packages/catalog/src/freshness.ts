import { InvalidVacancyError } from './errors';
import type { CachedVacancy, Freshness } from './types';

/** Vacancies older than this are excluded from automatic recommendation. */
export const DEFAULT_MAX_AGE_HOURS = 72;

const MS_PER_HOUR = 3_600_000;

function toDate(value: string, field: string, jobId: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new InvalidVacancyError(`Vacancy ${jobId} has an invalid ${field}: ${value}`);
  }
  return date;
}

function humanizeAge(ageHours: number): string {
  if (ageHours < 1) return 'menos de 1 hora';
  if (ageHours < 24) {
    const hours = Math.floor(ageHours);
    return `${hours} ${hours === 1 ? 'hora' : 'horas'}`;
  }
  const days = Math.floor(ageHours / 24);
  return `${days} ${days === 1 ? 'día' : 'días'}`;
}

/**
 * Compute a vacancy's age against `now` and decide whether it is stale.
 *
 * The age is measured from `postedAt` (when the vacancy was published), not
 * from when it was cached, so a long-lived cache entry cannot masquerade as
 * fresh. The returned label is dashboard-ready Spanish.
 */
export function computeFreshness(
  vacancy: CachedVacancy,
  { now, maxAgeHours = DEFAULT_MAX_AGE_HOURS }: { now: Date; maxAgeHours?: number },
): Freshness {
  const postedAt = toDate(vacancy.postedAt, 'postedAt', vacancy.jobId);
  const rawAgeHours = (now.getTime() - postedAt.getTime()) / MS_PER_HOUR;
  const ageHours = Number(Math.max(0, rawAgeHours).toFixed(2));
  const stale = ageHours > maxAgeHours;
  const label = stale
    ? `Publicada hace ${humanizeAge(ageHours)} · fuera del límite de ${maxAgeHours} h`
    : `Publicada hace ${humanizeAge(ageHours)}`;
  return { ageHours, maxAgeHours, stale, label };
}
