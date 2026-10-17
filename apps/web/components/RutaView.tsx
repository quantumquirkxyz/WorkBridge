'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import type { Roadmap } from '@workbridge/training';
import { ApiClientError } from '../lib/api/errors';
import { requestRoadmap } from '../lib/api/client';
import { saveExplorationSession } from '../lib/exploration-session';
import { formatCost } from '../lib/exploration-view';
import type { PreferencesDraft } from '../lib/preferences';
import { RoadmapList } from './exploration/RoadmapList';
import { useExploration } from './exploration/useExploration';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';
import '../app/styles/explore.css';

type RoadmapState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ready'; roadmap: Roadmap }
  | { kind: 'error'; message: string };

export function stepsHeadline(count: number, role: string | undefined): string {
  const steps = count === 1 ? '1 paso' : `${count} pasos`;
  return role ? `${steps} para acercarte a ${role}` : `${steps} para acercarte a las vacantes que buscas`;
}

export function RutaView() {
  const { status, result, reload, rerun } = useExploration();
  const [state, setState] = useState<RoadmapState>({ kind: 'idle' });
  const [enabling, setEnabling] = useState(false);
  const [enableError, setEnableError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const needsRoadmap = Boolean(result && result.matches.length === 0 && result.preferences.willing_to_train);

  useEffect(() => {
    if (!result || !needsRoadmap) {
      setState({ kind: 'idle' });
      return;
    }
    let current = true;
    setState({ kind: 'loading' });
    requestRoadmap(result)
      .then((response) => {
        if (!current) return;
        if (response.roadmap) {
          saveExplorationSession(result, response.roadmap);
          setState({ kind: 'ready', roadmap: response.roadmap });
        } else {
          setState({ kind: 'error', message: 'Todavía no pudimos armar tu ruta. Intenta de nuevo en un momento.' });
        }
      })
      .catch((error: unknown) => {
        if (!current) return;
        const needsProfile = error instanceof ApiClientError && error.apiError.status === 409;
        setState({
          kind: 'error',
          message: needsProfile
            ? 'Para armar tu ruta necesitamos conocer tu experiencia. Cuéntanosla en el chat.'
            : 'No pudimos cargar tu ruta. Revisa tu internet y vuelve a intentar.',
        });
      });
    return () => {
      current = false;
    };
  }, [result, needsRoadmap, attempt]);

  const enableTraining = useCallback(async () => {
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
  }, [result, rerun]);

  const head = (title: string, lead: string) => (
    <header className="page-head page-head-mint">
      <p className="eyebrow">Tu siguiente paso</p>
      <h1>{title}</h1>
      <p className="lead">{lead}</p>
    </header>
  );

  if (status === 'loading' || state.kind === 'loading' || (needsRoadmap && state.kind === 'idle')) {
    return (
      <main className="ruta-page xp-page" aria-busy="true">
        <p className="sr-only" role="status">Cargando tu ruta…</p>
        {head('Mi ruta', 'Estamos armando tus próximos pasos.')}
        <div className="xp-steps" aria-hidden="true">
          {[1, 2, 3].map((id) => <Skeleton key={id} className="xp-skel" style={{ minHeight: '8rem' }} />)}
        </div>
      </main>
    );
  }

  if (status === 'error') {
    return (
      <main className="ruta-page xp-page">
        {head('Mi ruta', 'Cursos para acercarte a las vacantes que buscas.')}
        <section className="xp-panel xp-panel-warn xp-empty" role="alert">
          <h2>No pudimos cargar tu ruta</h2>
          <p>Revisa tu internet y vuelve a intentar.</p>
          <Button type="button" onClick={reload}>Reintentar</Button>
        </section>
      </main>
    );
  }

  if (status === 'signed-out' || status === 'no-preferences' || !result) {
    return (
      <main className="ruta-page xp-page">
        {head('Mi ruta', 'Cursos para acercarte a las vacantes que buscas.')}
        <section className="xp-panel xp-empty" role="status">
          <span className="xp-empty-icon" aria-hidden="true">🧭</span>
          <h2>Aún no tienes una ruta</h2>
          <p>Cuéntanos qué buscas y, si hace falta, te sugerimos cursos para llegar ahí.</p>
          <Button asChild size="lg"><Link href="/chat">Empezar</Link></Button>
        </section>
      </main>
    );
  }

  if (result.matches.length > 0) {
    return (
      <main className="ruta-page xp-page">
        {head('Mi ruta', 'Cursos para acercarte a las vacantes que buscas.')}
        <section className="xp-panel xp-empty">
          <span className="xp-empty-icon" aria-hidden="true">🎉</span>
          <h2>Ya tienes vacantes para ti</h2>
          <p>Por ahora no necesitas una ruta de cursos. Si algo te falta para una vacante, lo verás en su detalle.</p>
          <Button asChild size="lg"><Link href="/vacantes">Ver mis vacantes</Link></Button>
        </section>
      </main>
    );
  }

  if (!result.preferences.willing_to_train) {
    return (
      <main className="ruta-page xp-page">
        {head('Mi ruta', 'Cursos para acercarte a las vacantes que buscas.')}
        <section className="xp-panel xp-empty">
          <span className="xp-empty-icon" aria-hidden="true">📚</span>
          <h2>No armamos una ruta de cursos</h2>
          <p>Dijiste que no quieres tomar cursos. Si cambias de idea, buscamos cursos para cerrar lo que te falta.</p>
          <Button type="button" onClick={() => void enableTraining()} disabled={enabling}>{enabling ? 'Buscando…' : 'Me interesa tomar cursos'}</Button>
          {enableError ? <p role="alert" className="xp-inline-error">{enableError}</p> : null}
        </section>
      </main>
    );
  }

  if (state.kind === 'error') {
    return (
      <main className="ruta-page xp-page">
        {head('Mi ruta', 'Cursos para acercarte a las vacantes que buscas.')}
        <section className="xp-panel xp-panel-warn xp-empty" role="alert">
          <h2>No pudimos cargar tu ruta</h2>
          <p>{state.message}</p>
          <div className="xp-row">
            <Button type="button" onClick={() => setAttempt((n) => n + 1)}>Reintentar</Button>
            <Button asChild variant="outline"><Link href="/chat?mode=profile">Contar mi experiencia</Link></Button>
          </div>
        </section>
      </main>
    );
  }

  if (state.kind !== 'ready') return null;
  const { roadmap } = state;
  const steps = roadmap.recommendations;
  const role = result.preferences.target_roles[0];

  if (steps.length === 0) {
    return (
      <main className="ruta-page xp-page">
        {head('Mi ruta', 'Cursos para acercarte a las vacantes que buscas.')}
        <section className="xp-panel xp-empty" role="status">
          <span className="xp-empty-icon" aria-hidden="true">🔎</span>
          <h2>Todavía no hay cursos para tus brechas</h2>
          <p>No encontramos un curso que encaje con tu horario y lo que te falta. Revisaremos de nuevo cuando haya más opciones.</p>
          <Button asChild variant="outline"><Link href="/perfil">Ajustar mis preferencias</Link></Button>
        </section>
        <RoadmapList roadmap={roadmap} />
      </main>
    );
  }

  const totalHours = steps.reduce((sum, step) => sum + step.opportunity.durationHours, 0);
  const totalCost = steps.reduce((sum, step) => sum + step.opportunity.costUsd, 0);
  return (
    <main className="ruta-page xp-page">
      {head('Tu ruta', stepsHeadline(steps.length, role))}
      <p className="xp-muted">Recomendación basada en tus últimas vacantes. En total: {totalHours} h · {formatCost(totalCost)}.</p>
      <RoadmapList roadmap={roadmap} />
      <Button asChild variant="outline"><Link href="/vacantes">Volver a mis vacantes</Link></Button>
    </main>
  );
}
