'use client';

import Link from 'next/link';
import { useMemo, useState, type KeyboardEvent } from 'react';
import { Skeleton } from '../ui/skeleton';
import { usePendingDrafts } from '../../lib/queries/applications';
import type { GateCode } from '../../lib/api/applications';
import { applyQueueView, countByGate, relativeWait, waitingSince, type QueueSort } from '../../lib/counselor-ui';
import { GateBadges } from './GateBadges';
import { QueryFailure } from './QueryFailure';
import { GATE_LABELS } from './labels';
import '../../app/styles/roles.css';

const GATE_CODES = Object.keys(GATE_LABELS) as GateCode[];

/** "n pendientes" counter for page headers; shares the queue query. */
export function CounselorQueueCount() {
  const { data } = usePendingDrafts();
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

export function CounselorQueue() {
  const { data, isPending, isError, error, refetch } = usePendingDrafts();
  const [gate, setGate] = useState<GateCode | 'all'>('all');
  const [sort, setSort] = useState<QueueSort>('newest');

  const counts = useMemo(() => countByGate(data ?? []), [data]);
  const drafts = useMemo(() => applyQueueView(data ?? [], { gate, sort }), [data, gate, sort]);

  if (isPending) return <Skeleton className="h-24 w-full" aria-label="Cargando postulaciones" />;
  if (isError) {
    return (
      <QueryFailure
        error={error}
        onRetry={() => void refetch()}
        nextPath="/orientador"
        fallbackCopy="No pudimos cargar las postulaciones. Intenta de nuevo en un momento."
      />
    );
  }

  if (data.length === 0) {
    return <p className="empty-state">No hay postulaciones esperando tu revisión 🎉</p>;
  }

  return (
    <div className="grid gap-4">
      <div className="rl-toolbar">
        <ul className="rl-filters" aria-label="Filtrar por motivo">
          <li>
            <button type="button" className="rl-chip" aria-pressed={gate === 'all'} onClick={() => setGate('all')}>
              Todas <span className="rl-chip-n">{data.length}</span>
            </button>
          </li>
          {GATE_CODES.filter((code) => counts[code] > 0 || gate === code).map((code) => (
            <li key={code}>
              <button type="button" className="rl-chip" aria-pressed={gate === code} onClick={() => setGate(code)}>
                {GATE_LABELS[code]} <span className="rl-chip-n">{counts[code]}</span>
              </button>
            </li>
          ))}
        </ul>
        <label className="rl-sort">
          Ordenar
          <select value={sort} onChange={(event) => setSort(event.target.value as QueueSort)}>
            <option value="newest">Más recientes primero</option>
            <option value="oldest">Más antiguas primero</option>
          </select>
        </label>
      </div>

      {drafts.length === 0 ? (
        <p className="empty-state">Ninguna postulación coincide con este filtro.</p>
      ) : (
        <ul className="queue" aria-label="Pendientes de revisión" onKeyDown={moveFocus}>
          {drafts.map((draft) => {
            const wait = relativeWait(waitingSince(draft.history));
            return (
              <li key={draft.draftId}>
                <Link
                  href={`/orientador/${encodeURIComponent(draft.draftId)}`}
                  className="queue-row"
                  style={{ '--status': 'var(--pink)' } as React.CSSProperties}
                >
                  <p className="queue-row-title">
                    {draft.candidateDisplayName ?? 'Candidato/a'} · {draft.vacancyTitle}
                  </p>
                  <GateBadges reasons={draft.counselorGate} />
                  <div className="rl-row-meta">
                    {draft.counselorGate[0] ? <span className="rl-row-detail">{draft.counselorGate[0].detail}</span> : null}
                    {wait ? <span>Esperando {wait}</span> : null}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
