import type { ExplorationResult } from '@workbridge/catalog';
import type { Roadmap } from '@workbridge/training';

const EXPLORATION_KEY = 'workbridge:exploration';
const ROADMAP_KEY = 'workbridge:roadmap';

export interface ExplorationSession {
  result: ExplorationResult;
  roadmap: Roadmap | null;
}

function read<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = window.sessionStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : null;
  } catch {
    return null;
  }
}

export function saveExplorationSession(result: ExplorationResult, roadmap: Roadmap | null): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(EXPLORATION_KEY, JSON.stringify(result));
    if (roadmap) window.sessionStorage.setItem(ROADMAP_KEY, JSON.stringify(roadmap));
    else window.sessionStorage.removeItem(ROADMAP_KEY);
  } catch {
    // Session storage is an enhancement; the current dashboard remains usable without it.
  }
}

export function readExplorationSession(): ExplorationSession | null {
  const result = read<ExplorationResult>(EXPLORATION_KEY);
  if (!result) return null;
  return { result, roadmap: read<Roadmap>(ROADMAP_KEY) };
}

export function clearExplorationSession(): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(EXPLORATION_KEY);
  window.sessionStorage.removeItem(ROADMAP_KEY);
}
