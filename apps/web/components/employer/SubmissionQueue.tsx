'use client';

import Link from 'next/link';
import { useMemo, useState, type KeyboardEvent } from 'react';
import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';
import { QueryFailure } from '../counselor/QueryFailure';
import { usePendingSubmissions } from '../../lib/queries/employer';
import { applySubmissionView, type EmployerSort } from '../../lib/employer-ui';
import '../../app/styles/roles.css';

/** "n pendientes" counter for page headers; shares the queue query. */
export function SubmissionQueueCount() {
  const { data } = usePendingSubmissions();
  if (!data) return null;
  return <p className="rl-count">{data.length} pendientes</p>;
}

function moveFocus(event: KeyboardEvent<HTMLUListElement>) {
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
  const rows = Array.from(event.currentTarget.querySelectorAll<HTMLAnchorElement>('a.queue-row'));
  const index = rows.indexOf(document.activeElement as HTMLAnchorElement);
  if (index === -1) return;
  const next = rows[index + (event.key === 'ArrowDown' ? 1 : -1)];
  if (!next) return;
  event.preventDefault();
  next.focus();
}

export function SubmissionQueue() {
  const { data, isPending, isError, error, refetch } = usePendingSubmissions();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<EmployerSort>('newest');
  const rows = useMemo(() => applySubmissionView(data ?? [], { search, sort }), [data, search, sort]);

  if (isPending) {
    return <p role="status" className="note-sticker">Cargando postulaciones…</p>;
  }

  if (isError) {
    return (
      <QueryFailure
        error={error}
        onRetry={() => void refetch()}
        nextPath="/empresa"
        fallbackCopy="No pudimos cargar las postulaciones. Intenta de nuevo."
      />
    );
  }

  if (data.length === 0) {
    return (
      <Card className="border-dashed shadow-none">
        <CardContent className="py-8 pt-8 text-center">
          <p className="font-display uppercase">No hay postulaciones pendientes</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="rl-toolbar">
        <label className="rl-sort">
          Buscar vacante
          <input
            type="search"
            className="rl-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Ej. Cajero/a"
          />
        </label>
        <label className="rl-sort">
          Ordenar
          <select value={sort} onChange={(event) => setSort(event.target.value as EmployerSort)}>
            <option value="newest">Más recientes primero</option>
            <option value="oldest">Más antiguas primero</option>
          </select>
        </label>
      </div>

      {rows.length === 0 ? (
        <p className="empty-state">Ninguna postulación coincide con tu búsqueda.</p>
      ) : (
        <ul className="queue" aria-label="Postulaciones pendientes" onKeyDown={moveFocus}>
          {rows.map((submission) => (
            <li key={submission.submissionId}>
              <Link
                href={`/empresa/${encodeURIComponent(submission.submissionId)}`}
                className="queue-row"
                style={{ '--status': 'var(--yellow)' } as React.CSSProperties}
              >
                <div className="queue-row-top">
                  <h2 className="queue-row-title">
                    {submission.vacancyTitle ?? `Postulación ${submission.submissionId.slice(0, 8)}`}
                  </h2>
                  <Badge tone="warning" className="sticker-tag shrink-0">Pendiente</Badge>
                </div>
                <p className="text-sm text-muted-foreground">Revisar documentos y decidir si pasa a entrevista.</p>
                <p className="rl-row-meta">Referencia {submission.submissionId.slice(0, 8)}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
