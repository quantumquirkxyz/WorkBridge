'use client';

import Link from 'next/link';
import { ChevronRight, FileText } from 'lucide-react';
import { useMemo } from 'react';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import { useMyDrafts } from '../../lib/applications-queries';
import {
  STATUS_PRESENTATION,
  deriveStatus,
  lastActivity,
  relativeTime,
  type DraftView,
} from '../../lib/applications-status';
import { QueryFailure, StatusBadge } from './shared';

function ListSkeleton() {
  return (
    <div className="app-skeleton-list" role="status" aria-label="Cargando tus postulaciones">
      {[0, 1, 2].map((index) => <Skeleton key={index} className="h-24 w-full" />)}
    </div>
  );
}

function Row({ draft }: { draft: DraftView }) {
  const status = deriveStatus(draft, draft);
  const { color, hint } = STATUS_PRESENTATION[status];
  const activity = relativeTime(lastActivity(draft));
  return (
    <li>
      <Link className="queue-row app-row" href={`/postulaciones/${encodeURIComponent(draft.draftId)}`} style={{ ['--status' as string]: `var(--${color === 'muted' ? 'muted' : color})` }}>
        <span className="queue-row-top">
          <span className="queue-row-title">{draft.vacancyTitle}</span>
          <ChevronRight className="app-row-chevron" aria-hidden="true" />
        </span>
        <span className="app-row-meta">
          <StatusBadge status={status} />
          {activity ? <span className="app-row-time">Actualizada {activity}</span> : null}
        </span>
        <span className="app-row-hint">{hint}</span>
      </Link>
    </li>
  );
}

export function ApplicationsList() {
  const { data, isPending, isError, error, refetch } = useMyDrafts();

  const drafts = useMemo(
    () => [...(data ?? [])].sort((a, b) => (lastActivity(b) ?? '').localeCompare(lastActivity(a) ?? '')),
    [data],
  );

  return (
    <main className="app-page">
      <header className="page-head page-head-sky">
        <p className="eyebrow">Tu progreso</p>
        <h1>Mis postulaciones</h1>
        <p className="lead">Tú decides qué se envía. Nunca mandamos nada sin tu permiso.</p>
      </header>

      {isPending ? (
        <ListSkeleton />
      ) : isError ? (
        <QueryFailure error={error} onRetry={() => void refetch()} title="No pudimos cargar tus postulaciones" />
      ) : drafts.length === 0 ? (
        <section className="empty-state app-empty">
          <FileText className="app-empty-icon" aria-hidden="true" />
          <h2 className="app-empty-title">Todavía no has preparado ninguna postulación</h2>
          <p>Encuentra una vacante que te guste y prepara tu postulación en un par de toques.</p>
          <Button asChild><Link href="/vacantes">Ver vacantes</Link></Button>
        </section>
      ) : (
        <>
          <p className="sr-only" role="status">{drafts.length} {drafts.length === 1 ? 'postulación' : 'postulaciones'}</p>
          <ul className="queue" aria-label="Mis postulaciones">
            {drafts.map((draft) => <Row key={draft.draftId} draft={draft} />)}
          </ul>
        </>
      )}
    </main>
  );
}
