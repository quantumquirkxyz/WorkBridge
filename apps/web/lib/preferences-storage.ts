/**
 * Candidate-scoped browser persistence for the latest explored preferences.
 *
 * A single global key would let one candidate's declaration leak into another
 * browser session, so the key is derived from the authenticated candidate id
 * shared by the chat, dashboard, and save-search flows — the same id used for
 * `puente:exploration:<candidateId>`.
 */
const PREFERENCES_PREFIX = 'puente:preferences';

export function preferencesStorageKey(candidateId: string): string {
  return `${PREFERENCES_PREFIX}:${candidateId}`;
}

export function saveStoredPreferences(
  candidateId: string,
  preferences: unknown,
  storage: Pick<Storage, 'setItem'> = window.localStorage,
): void {
  storage.setItem(preferencesStorageKey(candidateId), JSON.stringify(preferences));
}

export function readStoredPreferences<T = unknown>(
  candidateId: string,
  storage: Pick<Storage, 'getItem'> = window.localStorage,
): T | null {
  const raw = storage.getItem(preferencesStorageKey(candidateId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
