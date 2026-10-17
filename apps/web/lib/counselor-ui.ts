import type { CounselorDraft, GateCode, HistoryEntry } from './api/applications';
import { ApiClientError } from './api/errors';

export type QueueSort = 'newest' | 'oldest';
export interface QueueView {
  gate: GateCode | 'all';
  sort: QueueSort;
}

/** ISO timestamp since which a draft has been waiting for the counselor (candidate's last approval, else last event). */
export function waitingSince(history: HistoryEntry[]): string | undefined {
  const approvals = history.filter((entry) => entry.actorRole === 'candidate' && entry.action === 'approval');
  const pool = approvals.length > 0 ? approvals : history;
  return pool.length > 0 ? pool[pool.length - 1]!.timestamp : undefined;
}

/** "hace 3 h" style label; empty string when the timestamp is unusable. */
export function relativeWait(iso: string | undefined, now: number = Date.now()): string {
  if (!iso) return '';
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return '';
  const minutes = Math.max(0, Math.round((now - time) / 60000));
  if (minutes < 1) return 'hace un momento';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'hace 1 día' : `hace ${days} días`;
}

/** Count of drafts per gate code (a draft with several reasons counts once per code). */
export function countByGate(drafts: CounselorDraft[]): Record<GateCode, number> {
  const counts: Record<GateCode, number> = {
    critical_gap: 0,
    unverified_credential: 0,
    bias_alert: 0,
    infeasible_transport: 0,
  };
  for (const draft of drafts) {
    for (const code of new Set(draft.counselorGate.map((gate) => gate.code))) counts[code] += 1;
  }
  return counts;
}

/**
 * Filter by gate and order by waiting time. The runtime lists drafts in creation order, so the list
 * index is the tie-breaker when timestamps are missing or equal.
 */
export function applyQueueView(drafts: CounselorDraft[], view: QueueView): CounselorDraft[] {
  const indexed = drafts
    .map((draft, index) => ({ draft, index, since: Date.parse(waitingSince(draft.history) ?? '') }))
    .filter(({ draft }) => view.gate === 'all' || draft.counselorGate.some((gate) => gate.code === view.gate));
  indexed.sort((a, b) => {
    const byTime = Number.isNaN(a.since) || Number.isNaN(b.since) ? 0 : a.since - b.since;
    const order = byTime !== 0 ? byTime : a.index - b.index;
    return view.sort === 'oldest' ? order : -order;
  });
  return indexed.map(({ draft }) => draft);
}

export type FailureKind = 'unauthenticated' | 'forbidden' | 'not_found' | 'decided' | 'unavailable' | 'generic';

export function classifyFailure(error: unknown): FailureKind {
  if (!(error instanceof ApiClientError)) return 'generic';
  const { status, code } = error.apiError;
  if (status === 401) return 'unauthenticated';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not_found';
  if (status === 409 || code.endsWith('_decided') || code === 'draft_already_decided') return 'decided';
  if (status === 503) return 'unavailable';
  return 'generic';
}

export const FAILURE_COPY: Record<FailureKind, string> = {
  unauthenticated: 'Tu sesión terminó. Vuelve a ingresar para continuar.',
  forbidden: 'Tu cuenta no tiene permiso para ver esto.',
  not_found: 'Esta postulación no existe o ya no está disponible.',
  decided: 'Esta postulación ya fue decidida por otra persona. Actualizamos la vista.',
  unavailable: 'El servicio no está disponible por ahora. Intenta de nuevo en un momento.',
  generic: 'No pudimos completar la acción. Intenta de nuevo.',
};
