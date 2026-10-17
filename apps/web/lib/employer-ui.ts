import type { EmployerSubmissionSummary, HistoryEntry } from './api/employer';

export type EmployerSort = 'newest' | 'oldest';

/** Filter by vacancy title text and order by list position (the runtime lists in creation order). */
export function applySubmissionView(
  submissions: EmployerSubmissionSummary[],
  view: { search: string; sort: EmployerSort },
): EmployerSubmissionSummary[] {
  const needle = view.search.trim().toLocaleLowerCase('es');
  const rows = submissions.filter(
    (item) => needle === '' || (item.vacancyTitle ?? '').toLocaleLowerCase('es').includes(needle),
  );
  return view.sort === 'newest' ? [...rows].reverse() : rows;
}

/**
 * The employer only sees its own organization's movements and the submission itself; reasons written by the
 * candidate or the counselor are not part of the employer surface.
 */
export function employerVisibleHistory(history: HistoryEntry[] | undefined): HistoryEntry[] {
  return (history ?? []).filter((entry) => entry.actorRole === 'employer' || entry.action === 'submission');
}

export const EMPLOYER_ACTIONS: Record<string, string> = {
  submission: 'Postulación enviada',
  approval: 'Aprobó avanzar',
  rejection: 'Decidió no avanzar',
};

export const INTERVIEW_STATE_LABELS = {
  pending_employer_approval: 'Pendiente',
  approved: 'Entrevista aprobada',
  rejected: 'No avanzó',
} as const;
