const OWN_PREFIX = 'workbridge:';

function removeOwnKeys(storage: Storage): number {
  const doomed: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key?.startsWith(OWN_PREFIX)) doomed.push(key);
  }
  for (const key of doomed) storage.removeItem(key);
  return doomed.length;
}

/**
 * After "Eliminar mis datos" the browser must not keep a copy of what the server just
 * deleted: explored vacancies, stored preferences, saved vacancies, pending saves.
 * Returns how many entries were removed; storage failures are non-fatal.
 */
export function clearLocalCandidateData(
  stores: Storage[] = typeof window === 'undefined' ? [] : [window.localStorage, window.sessionStorage],
): number {
  let removed = 0;
  for (const store of stores) {
    try {
      removed += removeOwnKeys(store);
    } catch {
      // Storage may be blocked; the server-side deletion is what matters.
    }
  }
  return removed;
}
