'use client';

import type { ExplorationResult } from '@workbridge/catalog';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import { useCreateDraft } from '../../lib/applications-queries';
import { readExplorationSession } from '../../lib/exploration-session';
import { explorationStorageKey } from '../../lib/exploration-view';
import { resolveVacancyTitle } from '../../lib/vacancy-title';
import { QueryFailure } from './shared';

async function fetchCatalogTitle(jobId: string): Promise<string | null> {
  try {
    const response = await fetch(`/api/vacancies/${encodeURIComponent(jobId)}`);
    if (!response.ok) return null;
    const body = (await response.json()) as { title?: unknown };
    return typeof body.title === 'string' ? body.title : null;
  } catch {
    return null;
  }
}

async function fetchCandidateId(): Promise<string | null> {
  try {
    const response = await fetch('/api/candidate');
    if (!response.ok) return window.localStorage.getItem('workbridge:candidateId');
    const body = (await response.json()) as { candidateId?: unknown };
    if (typeof body.candidateId === 'string' && body.candidateId) return body.candidateId;
  } catch {
    // The stored exploration key is still usable when the session request fails.
  }
  try {
    return window.localStorage.getItem('workbridge:candidateId');
  } catch {
    return null;
  }
}

function readStoredExploration(candidateId: string): ExplorationResult | null {
  try {
    const raw = window.localStorage.getItem(explorationStorageKey(candidateId));
    return raw ? (JSON.parse(raw) as ExplorationResult) : null;
  } catch {
    return null;
  }
}

async function loadVacancyTitle(jobId: string): Promise<string | null> {
  const [catalogTitle, candidateId] = await Promise.all([fetchCatalogTitle(jobId), fetchCandidateId()]);
  return resolveVacancyTitle(jobId, {
    catalogTitle,
    storedExploration: candidateId ? readStoredExploration(candidateId) : null,
    sessionExploration: readExplorationSession()?.result ?? null,
  });
}

/**
 * /postulaciones/nueva?vacancy=<jobId>: builds the private draft from the match and
 * moves on to the detail. Nothing is sent to the employer here.
 */
export function NewApplication() {
  const router = useRouter();
  const vacancyId = useSearchParams().get('vacancy');
  const { mutate, isError, error, reset } = useCreateDraft();
  const started = useRef(false);
  const [attempt, setAttempt] = useState(0);
  const [missing, setMissing] = useState<'param' | 'title' | null>(null);

  useEffect(() => {
    if (started.current) return;
    if (!vacancyId) { setMissing('param'); return; }
    let cancelled = false;
    let invoked = false;
    started.current = true;
    (async () => {
      const title = await loadVacancyTitle(vacancyId);
      if (cancelled) return;
      if (!title) {
        started.current = false;
        setMissing('title');
        return;
      }
      invoked = true;
      mutate(
        { vacancyId, vacancyTitle: title },
        { onSuccess: (draft) => router.replace(`/postulaciones/${encodeURIComponent(draft.draftId)}`) },
      );
    })();
    return () => {
      cancelled = true;
      if (!invoked) started.current = false;
    };
  }, [vacancyId, mutate, router, attempt]);

  if (missing) {
    return (
      <main className="app-page">
        <section className="empty-state app-empty" role="alert">
          <h1 className="app-empty-title">Esa vacante ya no está disponible</h1>
          <p>No pudimos encontrar los datos de esta vacante. Elige otra desde la lista.</p>
          <Button asChild><Link href="/vacantes">Ver vacantes</Link></Button>
        </section>
      </main>
    );
  }

  return (
    <main className="app-page">
      <header className="page-head page-head-mint">
        <p className="eyebrow">Un momento</p>
        <h1>Preparando tu postulación</h1>
        <p className="lead">Armamos tu CV y tu carta solo con lo que ya nos contaste. Todavía no se envía nada.</p>
      </header>
      {isError ? (
        <QueryFailure
          error={error}
          title="No pudimos preparar tu postulación"
          onRetry={() => { reset(); started.current = false; setAttempt((value) => value + 1); }}
        />
      ) : (
        <div className="app-skeleton-list" role="status" aria-label="Preparando tu postulación">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      )}
    </main>
  );
}
