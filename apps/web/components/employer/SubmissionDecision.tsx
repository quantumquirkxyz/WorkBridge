'use client';

import Link from 'next/link';
import { useId, useRef, useState } from 'react';
import type { ApplicationDocuments, DraftFragment } from '../../lib/api/employer';
import { useEmployerSubmission, useInterviewDecision, type InterviewAction } from '../../lib/queries/employer';
import { EMPLOYER_ACTIONS, INTERVIEW_STATE_LABELS, employerVisibleHistory } from '../../lib/employer-ui';
import { classifyFailure } from '../../lib/counselor-ui';
import { QueryFailure } from '../counselor/QueryFailure';
import { formatWhen } from '../counselor/labels';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Label } from '../ui/label';
import { Skeleton } from '../ui/skeleton';
import { Textarea } from '../ui/textarea';
import '../../app/styles/roles.css';

const SECTIONS: Array<{ key: keyof ApplicationDocuments; label: string }> = [
  { key: 'cv', label: 'CV' },
  { key: 'coverLetter', label: 'Carta' },
  { key: 'application', label: 'Postulación' },
];

// Header strip colour per document section (index-aligned with SECTIONS).
const SECTION_TONES = ['bg-yellow', 'bg-pink', 'bg-mint'];

type Interview = 'pending_employer_approval' | 'approved' | 'rejected';

const OUTCOME_TONE: Record<Interview, string> = {
  pending_employer_approval: 'rl-state-pending',
  approved: 'rl-state-approved',
  rejected: 'rl-state-rejected',
};

const DONE_COPY: Record<InterviewAction['kind'], string> = {
  pass: 'La postulación pasó a entrevista.',
  decline: 'Registramos que la postulación no avanza.',
};

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
  const [saving, setSaving] = useState<InterviewAction['kind'] | null>(null);
  // Set synchronously so a double click cannot send the decision twice.
  const inFlight = useRef(false);
  const reasonId = useId();
  const errorId = useId();

  if (query.isPending) return <Skeleton className="h-40 w-full" aria-label="Cargando postulación" />;

  if (!submission) {
    return (
      <Card>
        <CardContent className="py-6">
          <QueryFailure
            error={query.error}
            onRetry={() => void query.refetch()}
            nextPath={`/empresa/${encodeURIComponent(submissionId)}`}
            hiddenCopy="Esta postulación no está disponible para tu organización."
            fallbackCopy="No pudimos cargar la postulación. Intenta de nuevo."
            backHref="/empresa"
            backLabel="Volver a postulaciones"
          />
        </CardContent>
      </Card>
    );
  }

  const evidence = approvedEvidence(submission.documents);
  const outcome: Interview = done ? (done === 'pass' ? 'approved' : 'rejected') : submission.interview;
  const decided = outcome !== 'pending_employer_approval';
  const history = employerVisibleHistory(submission.history);

  function act(kind: InterviewAction['kind']) {
    if (inFlight.current) return;
    if (reason.trim() === '') {
      setReasonError(true);
      return;
    }
    inFlight.current = true;
    setSaving(kind);
    decision.mutate(
      { kind, reason: reason.trim() },
      {
        onSuccess: () => setDone(kind),
        onError: (error) => {
          if (classifyFailure(error) === 'decided') void query.refetch();
        },
        onSettled: () => {
          inFlight.current = false;
          setSaving(null);
        },
      },
    );
  }

  const busy = saving !== null || decision.isPending;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Link className="back-link" href="/empresa">Volver a postulaciones</Link>
        <h2 className="rl-section-title">{submission.vacancyTitle || `Postulación ${submission.submissionId.slice(0, 8)}`}</h2>
        <Badge tone="neutral" className={`sticker-tag rl-state ${OUTCOME_TONE[outcome]}`}>
          {INTERVIEW_STATE_LABELS[outcome]}
        </Badge>
      </div>

      <div className="rl-layout">
        <div className="rl-main">
          <section aria-labelledby="documentos-titulo" className="space-y-3">
            <h2 id="documentos-titulo" className="rl-section-title">Documentos enviados</h2>
            {SECTIONS.map((section, sectionIndex) => (
              <div key={section.key} className="rl-doc">
                <h3 className={`rl-doc-head m-0 ${SECTION_TONES[sectionIndex]}`}>{section.label}</h3>
                <div className="rl-doc-body">
                  {submission.documents[section.key].length === 0 ? (
                    <p className="note-sticker">Sin contenido.</p>
                  ) : (
                    submission.documents[section.key].map((fragment, index) => (
                      <p key={`${section.key}-${index}`}>{fragment.text}</p>
                    ))
                  )}
                </div>
              </div>
            ))}
          </section>

          <section aria-labelledby="evidencia-titulo" className="space-y-2">
            <h2 id="evidencia-titulo" className="rl-section-title">Evidencia aprobada por la persona</h2>
            {evidence.length === 0 ? (
              <p className="note-sticker">La persona no aprobó evidencia para esta postulación.</p>
            ) : (
              <ul className="grid gap-2 p-0 text-sm">
                {evidence.map((text) => <li key={text} className="evidence-item">{text}</li>)}
              </ul>
            )}
          </section>
        </div>

        <aside className="rl-aside" aria-label="Decisión e historial">
          {done ? (
            <p role="status" className="status-banner status-banner-mint">{DONE_COPY[done]}</p>
          ) : decided ? (
            <p role="status" className="status-banner">Esta postulación ya fue decidida.</p>
          ) : (
            <form className="decision-panel" aria-label="Decisión de entrevista" aria-busy={busy} onSubmit={(event) => event.preventDefault()}>
              <div className="space-y-2">
                <Label htmlFor={reasonId}>Motivo de tu decisión*</Label>
                <Textarea
                  id={reasonId}
                  required
                  value={reason}
                  disabled={busy}
                  aria-invalid={reasonError || undefined}
                  aria-describedby={reasonError ? errorId : undefined}
                  onChange={(event) => {
                    setReason(event.target.value);
                    if (event.target.value.trim() !== '') setReasonError(false);
                  }}
                />
                {reasonError && (
                  <p id={errorId} role="alert" className="error">Escribe un motivo para continuar.</p>
                )}
              </div>
              {saving ? (
                <p role="status" className="note-sticker rl-saving">
                  {saving === 'pass' ? 'Guardando: Entrevista aprobada…' : 'Guardando: No avanzó…'}
                </p>
              ) : null}
              {decision.isError ? (
                <QueryFailure
                  error={decision.error}
                  nextPath={`/empresa/${encodeURIComponent(submissionId)}`}
                  fallbackCopy="No pudimos guardar tu decisión. Intenta de nuevo."
                />
              ) : null}
              <div className="rl-actions">
                <Button type="button" variant="outline" disabled={busy} onClick={() => act('decline')}>
                  No avanzar
                </Button>
                <Button type="button" disabled={busy} onClick={() => act('pass')}>
                  Aprobar entrevista
                </Button>
              </div>
            </form>
          )}

          {decided ? (
            <p className="note-sticker">La persona verá «{INTERVIEW_STATE_LABELS[outcome]}» en sus postulaciones.</p>
          ) : null}

          <section aria-labelledby="historial-empresa" className="grid gap-2">
            <h2 id="historial-empresa" className="rl-section-title">Historial</h2>
            {history.length === 0 ? (
              <p className="note-sticker">Todavía no hay decisiones de tu organización.</p>
            ) : (
              <ol className="timeline">
                {history.map((entry, index) => (
                  <li key={index} className="text-sm">
                    <strong>{EMPLOYER_ACTIONS[entry.action] ?? entry.action}</strong> ·{' '}
                    <time dateTime={entry.timestamp}>{formatWhen(entry.timestamp)}</time>
                    {entry.actorRole === 'employer' && entry.reason ? (
                      <span className="rl-history-reason">“{entry.reason}”</span>
                    ) : null}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
