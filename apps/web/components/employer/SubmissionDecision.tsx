'use client';

import Link from 'next/link';
import { useId, useState } from 'react';
import { ApiClientError } from '../../lib/api/errors';
import type { ApplicationDocuments, DraftFragment } from '../../lib/api/employer';
import { useEmployerSubmission, useInterviewDecision, type InterviewAction } from '../../lib/queries/employer';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';

const SECTIONS: Array<{ key: keyof ApplicationDocuments; label: string }> = [
  { key: 'cv', label: 'CV' },
  { key: 'coverLetter', label: 'Carta' },
  { key: 'application', label: 'Postulación' },
];

/** Evidence shown to the employer is the candidate-approved evidence that fed the submitted documents. */
function approvedEvidence(documents: ApplicationDocuments): string[] {
  const seen = new Set<string>();
  for (const section of SECTIONS) {
    for (const fragment of documents[section.key] as DraftFragment[]) {
      if (fragment.source === 'evidence') seen.add(fragment.text);
    }
  }
  return [...seen];
}

export function SubmissionDecision({ submissionId }: { submissionId: string }) {
  const query = useEmployerSubmission(submissionId);
  const submission = query.data;
  const decision = useInterviewDecision(submission);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState(false);
  const [done, setDone] = useState<InterviewAction['kind'] | null>(null);
  const reasonId = useId();
  const errorId = useId();

  if (query.isPending) return <p role="status" className="text-sm text-muted-foreground">Cargando postulación…</p>;

  if (query.isError || !submission) {
    const hidden = query.error instanceof ApiClientError && [403, 404].includes(query.error.apiError.status);
    return (
      <Card>
        <CardContent className="space-y-3 py-6">
          <p role="alert">
            {hidden
              ? 'Esta postulación no está disponible para tu organización.'
              : 'No pudimos cargar la postulación. Intenta de nuevo.'}
          </p>
          <Link className="text-sm underline" href="/empresa">Volver a postulaciones</Link>
        </CardContent>
      </Card>
    );
  }

  if (done) {
    return (
      <Card>
        <CardContent className="space-y-3 py-6">
          <p role="status" className="font-medium">
            {done === 'pass' ? 'La postulación pasó a entrevista.' : 'Registramos que la postulación no avanza.'}
          </p>
          <Link className="text-sm underline" href="/empresa">Volver a postulaciones</Link>
        </CardContent>
      </Card>
    );
  }

  const evidence = approvedEvidence(submission.documents);

  function act(kind: InterviewAction['kind']) {
    if (reason.trim() === '') {
      setReasonError(true);
      return;
    }
    decision.mutate({ kind, reason: reason.trim() }, { onSuccess: () => setDone(kind) });
  }

  return (
    <div className="space-y-4">
      <section aria-labelledby="documentos-titulo" className="space-y-3">
        <h2 id="documentos-titulo" className="text-base font-semibold">Documentos enviados</h2>
        {SECTIONS.map((section) => (
          <Card key={section.key}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{section.label}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {submission.documents[section.key].length === 0 ? (
                <p className="text-muted-foreground">Sin contenido.</p>
              ) : (
                submission.documents[section.key].map((fragment, index) => (
                  <p key={`${section.key}-${index}`}>{fragment.text}</p>
                ))
              )}
            </CardContent>
          </Card>
        ))}
      </section>

      <section aria-labelledby="evidencia-titulo" className="space-y-2">
        <h2 id="evidencia-titulo" className="text-base font-semibold">Evidencia aprobada por la persona</h2>
        {evidence.length === 0 ? (
          <p className="text-sm text-muted-foreground">La persona no aprobó evidencia para esta postulación.</p>
        ) : (
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {evidence.map((text) => <li key={text}>{text}</li>)}
          </ul>
        )}
      </section>

      {submission.interview !== 'pending_employer_approval' ? (
        <p role="status" className="text-sm font-medium">Esta postulación ya fue decidida.</p>
      ) : (
      <form className="space-y-3" aria-label="Decisión de entrevista" onSubmit={(event) => event.preventDefault()}>
        <div className="space-y-2">
          <Label htmlFor={reasonId}>Motivo de tu decisión*</Label>
          <Textarea
            id={reasonId}
            required
            value={reason}
            aria-invalid={reasonError || undefined}
            aria-describedby={reasonError ? errorId : undefined}
            onChange={(event) => {
              setReason(event.target.value);
              if (event.target.value.trim() !== '') setReasonError(false);
            }}
          />
          {reasonError && (
            <p id={errorId} role="alert" className="text-sm text-destructive">Escribe un motivo para continuar.</p>
          )}
        </div>
        {decision.isError && (
          <p role="alert" className="text-sm text-destructive">{decision.error.message}</p>
        )}
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" disabled={decision.isPending} onClick={() => act('decline')}>
            No avanza
          </Button>
          <Button type="button" disabled={decision.isPending} onClick={() => act('pass')}>
            Pasar a entrevista
          </Button>
        </div>
      </form>
      )}
    </div>
  );
}
