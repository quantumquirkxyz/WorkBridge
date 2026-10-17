'use client';

import Link from 'next/link';
import { Card, CardContent } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { usePendingDrafts } from '../../lib/queries/applications';
import { GateBadges } from './GateBadges';

export function CounselorQueue() {
  const { data, isPending, isError } = usePendingDrafts();

  if (isPending) return <Skeleton className="h-24 w-full" aria-label="Cargando postulaciones" />;
  if (isError) {
    return <p role="alert">No pudimos cargar las postulaciones. Intenta de nuevo en un momento.</p>;
  }

  // The runtime lists drafts in creation order, so the newest ones come last.
  const drafts = [...data].reverse();
  if (drafts.length === 0) {
    return <p className="text-center text-muted-foreground">No hay postulaciones esperando tu revisión 🎉</p>;
  }

  return (
    <ul className="grid gap-3" aria-label="Pendientes de revisión">
      {drafts.map((draft) => (
        <li key={draft.draftId}>
          <Link href={`/orientador/${encodeURIComponent(draft.draftId)}`} className="block">
            <Card>
              <CardContent className="grid gap-2 p-4">
                <p className="font-semibold">
                  {draft.candidateDisplayName ?? 'Candidato/a'} · {draft.vacancyTitle}
                </p>
                <GateBadges reasons={draft.counselorGate} />
              </CardContent>
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  );
}
