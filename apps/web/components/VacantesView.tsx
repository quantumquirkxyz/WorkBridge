'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { VacancyMatch } from '@workbridge/catalog';
import { ApiClientError } from '../lib/api/errors';
import { saveSearch } from '../lib/api/client';
import { useSession } from '../lib/auth-client';
import {
  decisionFor,
  freshnessSummary,
  greeting,
  readSavedVacancyIds,
  savedVacanciesStorageKey,
  toggleSavedVacancyId,
  vacanciesHeadline,
} from '../lib/exploration-view';
import { readStoredPreferences, saveStoredPreferences } from '../lib/preferences-storage';
import type { PreferencesDraft } from '../lib/preferences';
import { DiscardSummary } from './exploration/DiscardSummary';
import { NearMatchList } from './exploration/NearMatchList';
import { NoMatchPanel } from './exploration/NoMatchPanel';
import { SaveSearchDialog } from './exploration/SaveSearchDialog';
import { VacancyCard } from './exploration/VacancyCard';
import { VacancyDetailSheet } from './exploration/VacancyDetailSheet';
import { useExploration } from './exploration/useExploration';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';
import '../app/styles/explore.css';

const PENDING_SAVE_KEY = 'workbridge:pending-save';
const TOAST_MS = 5000;

function setVacancyParam(jobId: string | null, mode: 'push' | 'replace') {
  const url = new URL(window.location.href);
  if (jobId) url.searchParams.set('v', jobId);
  else url.searchParams.delete('v');
  if (mode === 'push') window.history.pushState({ xpSheet: true }, '', url);
  else window.history.replaceState({}, '', url);
}

export function VacantesView() {
  const { status, result, candidateId, decisions, decisionsLoading, offline, reload, rerun } = useExploration();
  const session = useSession();
  const [newMatches, setNewMatches] = useState<VacancyMatch[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveLabel, setSaveLabel] = useState('');
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedVacancies, setSavedVacancies] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [enabling, setEnabling] = useState(false);
  const [enableError, setEnableError] = useState<string | null>(null);
  const cardRefs = useRef(new Map<string, HTMLButtonElement>());
  const lastOpened = useRef<string | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);
  const pendingHandled = useRef(false);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), TOAST_MS);
  }, []);
  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const matches = useMemo(() => {
    const list = result?.matches ?? [];
    if (decisionsLoading || decisions.length === 0) return list;
    return [...list].sort((a, b) => (decisionFor(decisions, b.vacancy.jobId)?.score ?? -1) - (decisionFor(decisions, a.vacancy.jobId)?.score ?? -1));
  }, [result, decisions, decisionsLoading]);
  const newIds = useMemo(() => new Set(newMatches.map((match) => match.vacancy.jobId)), [newMatches]);
  const knownMatches = useMemo(() => [...matches, ...newMatches], [matches, newMatches]);
  const selected = knownMatches.find((match) => match.vacancy.jobId === selectedId) ?? null;

  // Saved vacancies (local-only convenience) and "new since last visit".
  useEffect(() => {
    if (!candidateId) return;
    setSavedVacancies(readSavedVacancyIds(candidateId));
    let current = true;
    (async () => {
      try {
        const response = await fetch(`/api/searches?candidateId=${encodeURIComponent(candidateId)}`);
        if (!response.ok || !current) return;
        const body = (await response.json()) as { searches?: Array<{ newSinceLastVisit?: VacancyMatch[] }> };
        setNewMatches(body.searches?.flatMap((view) => view.newSinceLastVisit ?? []) ?? []);
        await fetch(`/api/searches?candidateId=${encodeURIComponent(candidateId)}`, { method: 'PUT' });
      } catch {
        // New-vacancy highlights are an enhancement.
      }
    })();
    return () => {
      current = false;
    };
  }, [candidateId]);

  // ?v= deep link and browser back/forward.
  useEffect(() => {
    const sync = () => setSelectedId(new URLSearchParams(window.location.search).get('v'));
    sync();
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);

  // An unknown ?v= is dropped with a notice, but only once we actually know the list.
  useEffect(() => {
    if (!selectedId || status === 'loading' || selected) return;
    if (status !== 'ready') return;
    setVacancyParam(null, 'replace');
    setSelectedId(null);
    showToast('Esa vacante ya no está disponible');
  }, [selectedId, selected, status, showToast]);

  function open(match: VacancyMatch) {
    lastOpened.current = match.vacancy.jobId;
    setSelectedId(match.vacancy.jobId);
    setVacancyParam(match.vacancy.jobId, 'push');
  }

  function close() {
    setSelectedId(null);
    if (window.history.state?.xpSheet) window.history.back();
    else setVacancyParam(null, 'replace');
  }

  function restoreFocus(event: Event) {
    event.preventDefault();
    const id = lastOpened.current;
    if (id) cardRefs.current.get(id)?.focus();
  }

  const registerRef = (jobId: string) => (node: HTMLButtonElement | null) => {
    if (node) cardRefs.current.set(jobId, node);
    else cardRefs.current.delete(jobId);
  };

  function toggleSaved(jobId: string) {
    if (!candidateId) return;
    const next = toggleSavedVacancyId(savedVacancies, jobId);
    setSavedVacancies(next);
    try {
      window.localStorage.setItem(savedVacanciesStorageKey(candidateId), JSON.stringify(next));
    } catch {
      // Not persisted; the toggle still reflects this visit.
    }
    showToast(next.includes(jobId) ? 'Vacante guardada' : 'Quitamos la vacante de tus guardadas');
  }

  async function share(match: VacancyMatch) {
    const url = `${window.location.origin}/vacantes?v=${encodeURIComponent(match.vacancy.jobId)}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: match.vacancy.title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      showToast('Enlace copiado');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      showToast('No pudimos compartir. Copia el enlace desde la barra de direcciones.');
    }
  }

  const submitSearch = useCallback(
    async (label: string) => {
      if (!candidateId || !result) return;
      const preferences = readStoredPreferences(candidateId) ?? result.preferences;
      setSaveBusy(true);
      setSaveError(null);
      try {
        await saveSearch({ label: label.trim(), preferences: preferences as PreferencesDraft });
        saveStoredPreferences(candidateId, preferences);
        setSaveOpen(false);
        showToast('Búsqueda guardada. La verás en Mi perfil.');
      } catch (error) {
        if (error instanceof ApiClientError && error.apiError.status === 401) {
          window.sessionStorage.setItem(PENDING_SAVE_KEY, JSON.stringify({ label, preferences }));
          window.location.href = `/ingresar?next=${encodeURIComponent('/vacantes?save=1')}`;
          return;
        }
        setSaveError('No pudimos guardar tu búsqueda. Intenta de nuevo.');
      } finally {
        setSaveBusy(false);
      }
    },
    [candidateId, result, showToast],
  );

  // Resume a save that was interrupted by signing in.
  useEffect(() => {
    if (pendingHandled.current || !candidateId || !result) return;
    if (new URLSearchParams(window.location.search).get('save') !== '1') return;
    pendingHandled.current = true;
    const raw = window.sessionStorage.getItem(PENDING_SAVE_KEY);
    window.sessionStorage.removeItem(PENDING_SAVE_KEY);
    if (!raw) return;
    try {
      const pending = JSON.parse(raw) as { label?: unknown; preferences?: unknown };
      if (typeof pending.label === 'string' && pending.preferences) {
        saveStoredPreferences(candidateId, pending.preferences);
        setSaveLabel(pending.label);
        void submitSearch(pending.label);
      }
    } catch {
      // Discard malformed pending state.
    }
  }, [candidateId, result, submitSearch]);

  async function enableTraining() {
    if (!result) return;
    setEnabling(true);
    setEnableError(null);
    try {
      await rerun({ ...result.preferences, willing_to_train: true } as PreferencesDraft);
    } catch {
      setEnableError('No pudimos actualizar tu búsqueda. Intenta de nuevo.');
    } finally {
      setEnabling(false);
    }
  }

  const name = session.data?.user?.name;

  if (status === 'loading') return <VacantesSkeleton />;

  if (status === 'signed-out' || status === 'no-preferences') {
    return (
      <main className="vacantes-page xp-page">
        <section className="xp-panel xp-empty" aria-labelledby="start-heading">
          <span className="xp-empty-icon" aria-hidden="true">💼</span>
          <h1 id="start-heading" style={{ fontFamily: 'var(--font-display)', textTransform: 'uppercase', margin: 0 }}>Cuéntanos qué buscas</h1>
          <p>En unos minutos armamos tu perfil y te mostramos las vacantes que encajan contigo.</p>
          <Button asChild size="lg"><Link href="/chat">Empezar</Link></Button>
        </section>
      </main>
    );
  }

  if (status === 'error' || !result) {
    return (
      <main className="vacantes-page xp-page">
        <section className="xp-panel xp-panel-warn xp-empty" role="alert">
          <h1 style={{ fontFamily: 'var(--font-display)', textTransform: 'uppercase', margin: 0, fontSize: '1.5rem' }}>No pudimos cargar tus vacantes</h1>
          <p>Parece que no hay conexión o hubo un problema de nuestro lado. Revisa tu internet y vuelve a intentar.</p>
          <Button type="button" onClick={reload}>Reintentar</Button>
        </section>
      </main>
    );
  }

  const mainMatches = matches.filter((match) => !newIds.has(match.vacancy.jobId));
  const hasMatches = matches.length > 0;

  return (
    <main className="vacantes-page xp-page">
      {toast ? <div className="xp-toast" role="status">{toast}</div> : null}
      <header className="page-head">
        <p className="eyebrow">{greeting(name)}</p>
        <h1>{vacanciesHeadline(matches.length)}</h1>
        <p className="lead">{freshnessSummary(result)}</p>
        {hasMatches ? (
          <div className="xp-head-actions">
            <Button type="button" variant="outline" onClick={() => { setSaveError(null); setSaveOpen(true); }}>Guardar esta búsqueda</Button>
          </div>
        ) : null}
      </header>

      {offline ? <p className="xp-banner" role="status">No pudimos actualizar. Te mostramos lo último que guardamos. <button type="button" className="xp-course-link" onClick={reload}>Reintentar</button></p> : null}

      {newMatches.length > 0 ? (
        <section aria-labelledby="new-heading">
          <h2 id="new-heading" className="xp-section-title">Nuevas desde tu última visita</h2>
          <ul className="xp-grid">
            {newMatches.map((match) => (
              <li key={match.vacancy.jobId}>
                <VacancyCard ref={registerRef(match.vacancy.jobId)} match={match} isNew decision={decisionFor(decisions, match.vacancy.jobId)} decisionsLoading={decisionsLoading} onOpen={open} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {hasMatches ? (
        <section aria-labelledby="matches-heading">
          <h2 id="matches-heading" className="xp-section-title">{newMatches.length > 0 ? 'Todas tus vacantes' : 'Tus vacantes'}</h2>
          <ul className="xp-grid">
            {mainMatches.map((match) => (
              <li key={match.vacancy.jobId}>
                <VacancyCard ref={registerRef(match.vacancy.jobId)} match={match} decision={decisionFor(decisions, match.vacancy.jobId)} decisionsLoading={decisionsLoading} onOpen={open} />
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <NoMatchPanel result={result} onEnableTraining={enableTraining} enabling={enabling} enableError={enableError} />
      )}

      {result.noMatch ? <NearMatchList nearMatches={result.noMatch.nearMatches} /> : null}
      <DiscardSummary result={result} />

      <VacancyDetailSheet
        match={selected}
        decision={selected ? decisionFor(decisions, selected.vacancy.jobId) : undefined}
        decisionsLoading={decisionsLoading}
        saved={selected ? savedVacancies.includes(selected.vacancy.jobId) : false}
        onClose={close}
        onToggleSave={toggleSaved}
        onShare={(match) => void share(match)}
        onCloseAutoFocus={restoreFocus}
      />
      <SaveSearchDialog open={saveOpen} label={saveLabel} saving={saveBusy} error={saveError} onLabelChange={setSaveLabel} onOpenChange={setSaveOpen} onSave={() => void submitSearch(saveLabel)} />
    </main>
  );
}

function VacantesSkeleton() {
  return (
    <main className="vacantes-page xp-page" aria-busy="true">
      <p className="sr-only" role="status">Cargando tus vacantes…</p>
      <Skeleton className="xp-skel" style={{ minHeight: '8rem' }} />
      <ul className="xp-grid" aria-hidden="true">
        {[1, 2, 3].map((id) => <li key={id}><Skeleton className="xp-skel" /></li>)}
      </ul>
    </main>
  );
}
