import { EXCLUSION_LABELS, type ExcludedVacancy, type ExplorationResult } from '@workbridge/catalog';
import type { MatchDecision } from '@workbridge/solver';

/** Pure view helpers for the exploration screens. No React, no I/O: unit-testable. */

export const explorationStorageKey = (candidateId: string) => `workbridge:exploration:${candidateId}`;
export const savedVacanciesStorageKey = (candidateId: string) => `workbridge:saved-vacancies:${candidateId}`;

/** An exploration younger than this is shown as-is instead of being re-run on mount. */
export const FRESH_EXPLORATION_MS = 60_000;

export function isExplorationFresh(result: ExplorationResult | null, now: number = Date.now()): boolean {
  if (!result) return false;
  const generated = Date.parse(result.generatedAt);
  return Number.isFinite(generated) && now - generated >= 0 && now - generated < FRESH_EXPLORATION_MS;
}

/** "hace 2 h" style label from an ISO timestamp. */
export function relativeAge(iso: string, now: number = Date.now()): string {
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return 'hace un momento';
  const minutes = Math.max(0, Math.round((now - then) / 60_000));
  if (minutes < 1) return 'hace un momento';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'hace 1 día' : `hace ${days} días`;
}

export function vacanciesHeadline(count: number): string {
  if (count === 0) return 'Aún no hay vacantes para ti';
  return count === 1 ? '1 vacante para ti' : `${count} vacantes para ti`;
}

export function freshnessSummary(result: ExplorationResult, now: number = Date.now()): string {
  return `Revisamos ${result.summary.considered} · actualizado ${relativeAge(result.generatedAt, now)}`;
}

/** First name only, and only when it looks like a real name (never an email or anonymous placeholder). */
export function firstNameOf(name: string | null | undefined): string | null {
  const trimmed = (name ?? '').trim();
  if (!trimmed || trimmed.includes('@') || /^(anonymous|anónim[oa]|invitad[oa]|guest)/i.test(trimmed)) return null;
  return trimmed.split(/\s+/)[0] ?? null;
}

export function greeting(name: string | null | undefined): string {
  const first = firstNameOf(name);
  return first ? `Hola, ${first}` : 'Hola';
}

export interface DiscardCount {
  reason: ExcludedVacancy['reason'];
  label: string;
  count: number;
}

/** Group discards by their primary reason, most frequent first (ties keep the catalogue's priority order). */
export function summarizeDiscards(excluded: ExcludedVacancy[]): DiscardCount[] {
  const counts = new Map<ExcludedVacancy['reason'], number>();
  for (const entry of excluded) counts.set(entry.reason, (counts.get(entry.reason) ?? 0) + 1);
  return [...counts.entries()]
    .map(([reason, count]) => ({ reason, count, label: (EXCLUSION_LABELS[reason] ?? reason).toLowerCase() }))
    .sort((a, b) => b.count - a.count);
}

export function discardSentence(excluded: ExcludedVacancy[], max = 3): string | null {
  if (excluded.length === 0) return null;
  const parts = summarizeDiscards(excluded).slice(0, max).map((item) => `${item.label} (${item.count})`);
  const total = excluded.length === 1 ? '1 vacante no encaja' : `${excluded.length} vacantes no encajan`;
  return `${total}, sobre todo por: ${parts.join(', ')}.`;
}

export function decisionFor(decisions: MatchDecision[], jobId: string): MatchDecision | undefined {
  return decisions.find((decision) => decision.vacancyId === jobId);
}

/** What the candidate is missing, in plain words, straight from the solver's failed hard constraints. */
export function missingItems(decision: MatchDecision | undefined, max?: number): string[] {
  const items = (decision?.hardConstraints ?? []).filter((item) => !item.satisfied).map((item) => item.reason);
  return max ? items.slice(0, max) : items;
}

/** What the candidate already has: satisfied hard constraints first, then scoring dimensions with signal. */
export function haveItems(decision: MatchDecision | undefined): string[] {
  if (!decision) return [];
  const satisfied = decision.hardConstraints.filter((item) => item.satisfied).map((item) => item.reason);
  const scored = decision.scoreBreakdown.filter((item) => item.rawScore >= 60).flatMap((item) => item.reasons);
  return [...new Set([...satisfied, ...scored])].filter(Boolean);
}

export type ReadinessTone = 'high' | 'medium' | 'low';

export function readinessTone(score: number): ReadinessTone {
  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

export function clampScore(score: number): number {
  return Math.min(100, Math.max(0, Math.round(Number.isFinite(score) ? score : 0)));
}

export function formatSalary(min: number | null, max: number | null): string {
  if (min === null && max === null) return 'Salario no publicado';
  if (min === null) return `Hasta USD ${max}`;
  if (max === null) return `Desde USD ${min}`;
  return min === max ? `USD ${min}` : `USD ${min}–${max}`;
}

export function formatCost(costUsd: number): string {
  return costUsd === 0 ? 'Gratis' : `USD ${costUsd}`;
}

export function newCountLabel(count: number): string {
  return count === 1 ? '1 nueva' : `${count} nuevas`;
}

export function readSavedVacancyIds(candidateId: string, storage: Pick<Storage, 'getItem'> = window.localStorage): string[] {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(savedVacanciesStorageKey(candidateId)) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

export function toggleSavedVacancyId(ids: string[], jobId: string): string[] {
  return ids.includes(jobId) ? ids.filter((id) => id !== jobId) : [...ids, jobId];
}
