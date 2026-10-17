'use client';

import Link from 'next/link';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { usePendingSubmissions } from '../../lib/queries/employer';

export function SubmissionQueue() {
  const { data, isPending, isError } = usePendingSubmissions();

  if (isPending) {
    return <p role="status" className="text-sm text-muted-foreground">Cargando postulaciones…</p>;
  }

  if (isError) {
    return <p role="alert" className="text-sm text-destructive">No pudimos cargar las postulaciones. Intenta de nuevo.</p>;
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="font-medium">No hay postulaciones pendientes</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <ul className="grid gap-3" aria-label="Postulaciones pendientes">
      {data.map((submission) => (
        <li key={submission.submissionId}>
          <Link
            href={`/empresa/${encodeURIComponent(submission.submissionId)}`}
            className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Card className="transition-colors hover:bg-muted/50">
              <CardHeader className="gap-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{submission.vacancyTitle ?? `Postulación ${submission.submissionId.slice(0, 8)}`}</CardTitle>
                  <Badge tone="warning">Pendiente</Badge>
                </div>
                <CardDescription>Revisar documentos y decidir si pasa a entrevista.</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  );
}
