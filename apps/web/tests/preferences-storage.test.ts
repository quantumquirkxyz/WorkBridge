import { describe, expect, it } from 'vitest';
import { preferencesStorageKey, readStoredPreferences, saveStoredPreferences } from '@/lib/preferences-storage';

function memoryStorage(initial: Record<string, string> = {}) {
  const entries = new Map(Object.entries(initial));
  return {
    setItem: (key: string, value: string) => { entries.set(key, value); },
    getItem: (key: string) => entries.get(key) ?? null,
  };
}

describe('preferences storage', () => {
  it('scopes the key by candidate id', () => {
    expect(preferencesStorageKey('candidate-a')).toBe('workbridge:preferences:candidate-a');
  });

  it('does not leak preferences between candidates', () => {
    const storage = memoryStorage();
    saveStoredPreferences('candidate-a', { target_roles: ['Ventas'] }, storage);
    expect(readStoredPreferences('candidate-a', storage)).toEqual({ target_roles: ['Ventas'] });
    expect(readStoredPreferences('candidate-b', storage)).toBeNull();
  });

  it('returns null for malformed stored preferences', () => {
    const storage = memoryStorage({ [preferencesStorageKey('candidate-a')]: '{not json' });
    expect(readStoredPreferences('candidate-a', storage)).toBeNull();
  });
});
