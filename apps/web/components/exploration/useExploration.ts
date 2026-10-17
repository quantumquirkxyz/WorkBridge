'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ExplorationResult } from '@workbridge/catalog';
import type { MatchDecision } from '@workbridge/solver';
import { ApiClientError } from '../../lib/api/errors';
import { exploreVacancies, getPreferences, matchVacancies } from '../../lib/api/client';
import { explorationStorageKey, isExplorationFresh } from '../../lib/exploration-view';
import { readStoredPreferences, saveStoredPreferences } from '../../lib/preferences-storage';
import type { PreferencesDraft } from '../../lib/preferences';

export type ExplorationStatus = 'loading' | 'ready' | 'no-preferences' | 'signed-out' | 'error';

export interface ExplorationState {
  status: ExplorationStatus;
  result: ExplorationResult | null;
  candidateId: string | null;
  decisions: MatchDecision[];
  decisionsLoading: boolean;
  /** True when a refresh failed and the screen is showing the last saved exploration. */
  offline: boolean;
  reload: () => void;
  /** Re-run the exploration with explicit preferences (e.g. after enabling training). */
  rerun: (draft: PreferencesDraft) => Promise<void>;
}

function readStoredResult(candidateId: string): ExplorationResult | null {
  try {
    const raw = window.localStorage.getItem(explorationStorageKey(candidateId));
    return raw ? (JSON.parse(raw) as ExplorationResult) : null;
  } catch {
    return null;
  }
}

export function persistExploration(candidateId: string, result: ExplorationResult): void {
  try {
    window.localStorage.setItem(explorationStorageKey(candidateId), JSON.stringify(result));
    saveStoredPreferences(candidateId, result.preferences);
  } catch {
    // Storage is an enhancement; the screen works without it.
  }
}

async function resolveCandidateId(): Promise<string | 'signed-out'> {
  const response = await fetch('/api/candidate');
  if (response.status === 401) return 'signed-out';
  if (!response.ok) throw new Error('candidate_unavailable');
  const body = (await response.json()) as { candidateId?: string };
  if (!body.candidateId) return 'signed-out';
  return body.candidateId;
}

/** Loads the candidate's exploration: instant from storage, then refreshed from the server. */
export function useExploration(): ExplorationState {
  const [status, setStatus] = useState<ExplorationStatus>('loading');
  const [result, setResult] = useState<ExplorationResult | null>(null);
  const [candidateId, setCandidateId] = useState<string | null>(null);
  const [decisions, setDecisions] = useState<MatchDecision[]>([]);
  const [decisionsLoading, setDecisionsLoading] = useState(false);
  const [offline, setOffline] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const idRef = useRef<string | null>(null);

  const loadDecisions = useCallback(async (next: ExplorationResult, isCurrent: () => boolean) => {
    const ids = next.matches.map((match) => match.vacancy.jobId);
    if (ids.length === 0) {
      setDecisions([]);
      return;
    }
    setDecisionsLoading(true);
    try {
      const response = await matchVacancies(ids);
      if (isCurrent()) setDecisions(response.decisions);
    } catch {
      if (isCurrent()) setDecisions([]);
    } finally {
      if (isCurrent()) setDecisionsLoading(false);
    }
  }, []);

  useEffect(() => {
    let current = true;
    const isCurrent = () => current;
    setStatus('loading');
    setOffline(false);

    (async () => {
      let id: string | 'signed-out';
      try {
        id = await resolveCandidateId();
      } catch {
        if (current) setStatus('error');
        return;
      }
      if (!current) return;
      if (id === 'signed-out') {
        setStatus('signed-out');
        return;
      }
      idRef.current = id;
      setCandidateId(id);

      const stored = readStoredResult(id);
      if (stored) {
        setResult(stored);
        setStatus('ready');
      }
      if (stored && isExplorationFresh(stored)) {
        void loadDecisions(stored, isCurrent);
        return;
      }

      let preferences: unknown = stored?.preferences ?? readStoredPreferences(id);
      if (!preferences) {
        try {
          preferences = await getPreferences(id);
        } catch (error) {
          if (!current) return;
          if (error instanceof ApiClientError && error.apiError.status === 404) setStatus('no-preferences');
          else setStatus('error');
          return;
        }
      }
      if (!current) return;

      try {
        const fresh = await exploreVacancies(preferences as PreferencesDraft);
        if (!current) return;
        persistExploration(id, fresh);
        setResult(fresh);
        setStatus('ready');
        void loadDecisions(fresh, isCurrent);
      } catch (error) {
        if (!current) return;
        if (error instanceof ApiClientError && error.apiError.status === 401) setStatus('signed-out');
        else if (stored) {
          setOffline(true);
          void loadDecisions(stored, isCurrent);
        } else setStatus('error');
      }
    })();

    return () => {
      current = false;
    };
  }, [attempt, loadDecisions]);

  const rerun = useCallback(
    async (draft: PreferencesDraft) => {
      const id = idRef.current;
      const fresh = await exploreVacancies(draft);
      if (id) persistExploration(id, fresh);
      setResult(fresh);
      setStatus('ready');
      setOffline(false);
      void loadDecisions(fresh, () => true);
    },
    [loadDecisions],
  );

  return { status, result, candidateId, decisions, decisionsLoading, offline, reload: () => setAttempt((n) => n + 1), rerun };
}
