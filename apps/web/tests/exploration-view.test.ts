import { describe, expect, it } from 'vitest';
import type { ExcludedVacancy, ExplorationResult } from '@workbridge/catalog';
import type { MatchDecision } from '@workbridge/solver';
import {
  clampScore, discardSentence, firstNameOf, formatCost, formatSalary, freshnessSummary, greeting, haveItems,
  isExplorationFresh, missingItems, newCountLabel, readinessTone, relativeAge, summarizeDiscards, toggleSavedVacancyId,
  vacanciesHeadline,
} from '../lib/exploration-view';
import { clearLocalCandidateData } from '../lib/profile-view';

const NOW = Date.parse('2026-10-17T12:00:00Z');
const excluded = (reason: ExcludedVacancy['reason']): ExcludedVacancy => ({ jobId: `j-${Math.random()}`, reason, detail: '', failedConstraints: [], freshness: {} as never });

describe('exploration view helpers', () => {
  it('formats relative ages in Spanish', () => {
    expect(relativeAge('2026-10-17T11:59:40Z', NOW)).toBe('hace un momento');
    expect(relativeAge('2026-10-17T11:30:00Z', NOW)).toBe('hace 30 min');
    expect(relativeAge('2026-10-17T10:00:00Z', NOW)).toBe('hace 2 h');
    expect(relativeAge('2026-10-16T08:00:00Z', NOW)).toBe('hace 1 día');
    expect(relativeAge('2026-10-14T12:00:00Z', NOW)).toBe('hace 3 días');
    expect(relativeAge('nope', NOW)).toBe('hace un momento');
  });

  it('builds headline, freshness summary and greeting', () => {
    expect(vacanciesHeadline(0)).toBe('Aún no hay vacantes para ti');
    expect(vacanciesHeadline(1)).toBe('1 vacante para ti');
    expect(vacanciesHeadline(3)).toBe('3 vacantes para ti');
    const result = { generatedAt: '2026-10-17T10:00:00Z', summary: { considered: 24 } } as ExplorationResult;
    expect(freshnessSummary(result, NOW)).toBe('Revisamos 24 · actualizado hace 2 h');
    expect(greeting('Ana María Pérez')).toBe('Hola, Ana');
    expect(greeting('ana@correo.com')).toBe('Hola');
    expect(firstNameOf('Anonymous')).toBeNull();
    expect(firstNameOf(undefined)).toBeNull();
  });

  it('knows when an exploration is fresh enough to skip a refresh', () => {
    const at = (iso: string) => ({ generatedAt: iso }) as ExplorationResult;
    expect(isExplorationFresh(at('2026-10-17T11:59:30Z'), NOW)).toBe(true);
    expect(isExplorationFresh(at('2026-10-17T11:00:00Z'), NOW)).toBe(false);
    expect(isExplorationFresh(null, NOW)).toBe(false);
  });

  it('summarizes discards by cause without leaking ids', () => {
    const list = [excluded('schedule'), excluded('salary'), excluded('schedule'), excluded('schedule'), excluded('salary'), excluded('location')];
    expect(summarizeDiscards(list).map((item) => [item.label, item.count])).toEqual([['horario', 3], ['salario', 2], ['ubicación', 1]]);
    expect(discardSentence(list, 2)).toBe('6 vacantes no encajan, sobre todo por: horario (3), salario (2).');
    expect(discardSentence([excluded('salary')])).toBe('1 vacante no encaja, sobre todo por: salario (1).');
    expect(discardSentence([])).toBeNull();
  });

  it('splits solver decisions into what the candidate has and lacks', () => {
    const decision = {
      hardConstraints: [
        { id: 'schedule', satisfied: true, reason: 'Horario compatible' },
        { id: 'mandatory_skills', satisfied: false, reason: 'Excel básico' },
        { id: 'salary', satisfied: false, reason: 'Salario por debajo de tu mínimo' },
      ],
      scoreBreakdown: [
        { dimension: 'technical', rawScore: 80, reasons: ['Atención al cliente'] },
        { dimension: 'salary', rawScore: 10, reasons: ['Poco margen'] },
      ],
    } as unknown as MatchDecision;
    expect(missingItems(decision, 1)).toEqual(['Excel básico']);
    expect(missingItems(decision)).toHaveLength(2);
    expect(haveItems(decision)).toEqual(['Horario compatible', 'Atención al cliente']);
    expect(missingItems(undefined)).toEqual([]);
    expect(haveItems(undefined)).toEqual([]);
  });

  it('maps readiness, money and counts', () => {
    expect(readinessTone(85)).toBe('high');
    expect(readinessTone(50)).toBe('medium');
    expect(readinessTone(10)).toBe('low');
    expect(clampScore(140)).toBe(100);
    expect(clampScore(Number.NaN)).toBe(0);
    expect(formatSalary(600, 700)).toBe('USD 600–700');
    expect(formatSalary(null, null)).toBe('Salario no publicado');
    expect(formatSalary(500, null)).toBe('Desde USD 500');
    expect(formatSalary(null, 900)).toBe('Hasta USD 900');
    expect(formatCost(0)).toBe('Gratis');
    expect(formatCost(25)).toBe('USD 25');
    expect(newCountLabel(1)).toBe('1 nueva');
    expect(newCountLabel(3)).toBe('3 nuevas');
    expect(toggleSavedVacancyId(['a'], 'b')).toEqual(['a', 'b']);
    expect(toggleSavedVacancyId(['a', 'b'], 'a')).toEqual(['b']);
  });
});

describe('clearLocalCandidateData', () => {
  function fakeStorage(entries: Record<string, string>): Storage {
    const map = new Map(Object.entries(entries));
    return {
      get length() { return map.size; },
      key: (index: number) => [...map.keys()][index] ?? null,
      getItem: (key: string) => map.get(key) ?? null,
      setItem: (key: string, value: string) => void map.set(key, value),
      removeItem: (key: string) => void map.delete(key),
      clear: () => map.clear(),
    };
  }

  it('removes only workbridge entries from every store', () => {
    const local = fakeStorage({ 'workbridge:exploration:c1': '{}', 'workbridge:preferences:c1': '{}', theme: 'dark' });
    const session = fakeStorage({ 'workbridge:pending-save': '{}' });
    expect(clearLocalCandidateData([local, session])).toBe(3);
    expect(local.getItem('theme')).toBe('dark');
    expect(local.length).toBe(1);
    expect(session.length).toBe(0);
  });

  it('survives blocked storage', () => {
    const blocked = { get length(): number { throw new Error('blocked'); } } as unknown as Storage;
    expect(clearLocalCandidateData([blocked])).toBe(0);
  });
});
