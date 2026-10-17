'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Skeleton } from '../ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Textarea } from '../ui/textarea';
import type { CounselorDecision, CounselorDraft, DraftEvidence, DraftFragment } from '../../lib/api/applications';
import { useCounselorDraft, useDecideDraft } from '../../lib/queries/applications';
import { classifyFailure, relativeWait, waitingSince } from '../../lib/counselor-ui';
import { GateBadges } from './GateBadges';
import { QueryFailure } from './QueryFailure';
import { VerificationBadge } from './VerificationBadge';
import { ACTION_LABELS, GATE_HINTS, GATE_LABELS, MIN_REASON_LENGTH, ROLE_LABELS, SOURCE_LABELS, formatWhen } from './labels';
import '../../app/styles/roles.css';

function Fragments({ items, evidence }: { items: DraftFragment[]; evidence: DraftEvidence[] }) {
  if (items.length === 0) return <p className="note-sticker">Sin contenido.</p>;
  return (
    <div className="grid gap-2">
      {items.map((item, index) => {
        const backing = evidence.filter((entry) => item.evidenceIds.includes(entry.id));
        return (
          <div key={index} className="doc-fragment rl-fragment">
            <p className="m-0">{item.text}</p>
            <div className="rl-fragment-meta">
              <Badge tone="neutral" className="sticker-tag">{SOURCE_LABELS[item.source]}</Badge>
              {backing.map((entry) => (
                <VerificationBadge key={entry.id} status={entry.credentialStatus} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

type Outcome = 'approved' | 'rejected' | 'submitted' | null;

function outcomeOf(draft: CounselorDraft, done: CounselorDecision | null): Outcome {
  if (done === 'rejections' || draft.status === 'rejected') return 'rejected';
  if (draft.status === 'submitted') return 'submitted';
  if (done === 'approvals' || draft.counselorApproved) return 'approved';
  return null;
}

const OUTCOME_COPY = {
  approved: { message: 'Aprobaste esta postulación.', badge: 'Aprobada', tone: 'rl-state-approved' },
  rejected: { message: 'Rechazaste esta postulación.', badge: 'Rechazada', tone: 'rl-state-rejected' },
  submitted: { message: 'Esta postulación ya fue enviada.', badge: 'Enviada', tone: 'rl-state-approved' },
} as const;

export function CounselorReview({ draftId }: { draftId: string }) {
  const { data: draft, isPending, isError, error, refetch } = useCounselorDraft(draftId);
  const decide = useDecideDraft({ draftId, traceId: draft?.traceId ?? '' });
  const [reason, setReason] = useState('');
  const [done, setDone] = useState<CounselorDecision | null>(null);
  // Optimistic marker: set synchronously on click so a double click can never fire a second request.
  const [saving, setSaving] = useState<CounselorDecision | null>(null);
  const inFlight = useRef(false);

  if (isPending) return <Skeleton className="h-40 w-full" aria-label="Cargando postulación" />;
  if (isError) {
    return (
      <QueryFailure
        error={error}
        onRetry={() => void refetch()}
        nextPath={`/orientador/${encodeURIComponent(draftId)}`}
        fallbackCopy="No pudimos cargar esta postulación."
        backHref="/orientador"
        backLabel="Volver a pendientes"
      />
    );
  }

  const trimmed = reason.trim();
  const tooShort = trimmed.length < MIN_REASON_LENGTH;
  const outcome = outcomeOf(draft, done);
  const failure = decide.isError ? classifyFailure(decide.error) : null;
  const wait = relativeWait(waitingSince(draft.history));

  function submit(decision: CounselorDecision) {
    if (tooShort || inFlight.current) return;
    inFlight.current = true;
    setSaving(decision);
    decide.mutate(
      { decision, reason: trimmed },
      {
        onSuccess: () => {
          setDone(decision);
          setReason('');
        },
        onError: (mutationError) => {
          // Someone else already decided: reload the real state instead of leaving a stale form.
          if (classifyFailure(mutationError) === 'decided') void refetch();
        },
        onSettled: () => {
          inFlight.current = false;
          setSaving(null);
        },
      },
    );
  }

  const busy = saving !== null || decide.isPending;
  const resultCopy = outcome ? OUTCOME_COPY[outcome] : null;

  return (
    <div className="grid gap-6">
      <Link href="/orientador" className="back-link">
        Volver a pendientes
      </Link>
      <header className="page-head page-head-pink grid gap-3">
        <h1>
          {draft.candidateDisplayName ?? 'Candidato/a'} → {draft.vacancyTitle}
        </h1>
        <GateBadges reasons={draft.counselorGate} />
        {wait ? <p className="m-0 text-sm font-bold">Esperando tu revisión {wait}</p> : null}
      </header>

      <div className="rl-layout">
        <div className="rl-main">
          <Tabs defaultValue="cv">
            <TabsList>
              <TabsTrigger value="cv">CV</TabsTrigger>
              <TabsTrigger value="carta">Carta</TabsTrigger>
              <TabsTrigger value="evidencia">
                Evidencia <span aria-hidden="true">({draft.evidence.length})</span>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="cv">
              <Fragments items={draft.documents.cv} evidence={draft.evidence} />
            </TabsContent>
            <TabsContent value="carta">
              <Fragments items={draft.documents.coverLetter} evidence={draft.evidence} />
            </TabsContent>
            <TabsContent value="evidencia">
              {draft.evidence.length === 0 ? (
                <p className="note-sticker">La persona no declaró evidencia.</p>
              ) : (
                <ul className="grid gap-3 p-0">
                  {draft.evidence.map((item) => (
                    <li key={item.id} className="evidence-item">
                      <span>{item.text}</span>
                      <VerificationBadge status={item.credentialStatus} />
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>
          </Tabs>

          <section aria-labelledby="historial" className="grid gap-2">
            <h2 id="historial" className="rl-section-title">
              Historial
            </h2>
            {draft.history.length === 0 ? (
              <p className="note-sticker">Todavía no hay movimientos.</p>
            ) : (
              <ol className="timeline">
                {draft.history.map((entry, index) => (
                  <li key={index} className="text-sm">
                    <strong>{ROLE_LABELS[entry.actorRole]}</strong> {ACTION_LABELS[entry.action] ?? entry.action} ·{' '}
                    <time dateTime={entry.timestamp}>{formatWhen(entry.timestamp)}</time>
                    {entry.reason ? <span className="rl-history-reason">“{entry.reason}”</span> : null}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <aside className="rl-aside" aria-label="Revisión y decisión">
          {draft.counselorGate.length > 0 ? (
            <section aria-labelledby="motivos" className="grid gap-2">
              <h2 id="motivos" className="rl-section-title">
                Por qué llegó a ti
              </h2>
              <ul className="rl-gate-list">
                {draft.counselorGate.map((gate) => (
                  <li key={`${gate.code}-${gate.detail}`} className="rl-gate">
                    <strong>{GATE_LABELS[gate.code]}</strong>
                    <p>{gate.detail}</p>
                    <p className="rl-gate-hint">{GATE_HINTS[gate.code]}</p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {resultCopy ? (
            <div className="grid gap-2">
              <Badge tone="neutral" className={`sticker-tag w-fit rl-state ${resultCopy.tone}`}>{resultCopy.badge}</Badge>
              <p role="status" className="status-banner status-banner-mint">
                {resultCopy.message}
              </p>
              <Link href="/orientador" className="back-link">
                Siguiente pendiente
              </Link>
            </div>
          ) : (
            <form className="decision-panel" onSubmit={(event) => event.preventDefault()} aria-busy={busy}>
              <Label htmlFor="motivo">Motivo de tu decisión*</Label>
              <Textarea
                id="motivo"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                aria-describedby="motivo-ayuda"
                disabled={busy}
                required
              />
              <p id="motivo-ayuda" className="rl-reason-meta">
                <span>Escribe al menos {MIN_REASON_LENGTH} caracteres.</span>
                <span aria-hidden="true">{trimmed.length}/{MIN_REASON_LENGTH}</span>
              </p>
              {saving ? (
                <p role="status" className="note-sticker rl-saving">
                  {saving === 'approvals' ? 'Guardando: Aprobada…' : 'Guardando: Rechazada…'}
                </p>
              ) : null}
              {failure ? (
                <QueryFailure
                  error={decide.error}
                  nextPath={`/orientador/${encodeURIComponent(draftId)}`}
                  fallbackCopy="No pudimos guardar tu decisión. Intenta de nuevo."
                />
              ) : null}
              <div className="rl-actions">
                <Button type="button" variant="outline" disabled={tooShort || busy} onClick={() => submit('rejections')}>
                  Rechazar
                </Button>
                <Button type="button" disabled={tooShort || busy} onClick={() => submit('approvals')}>
                  Aprobar
                </Button>
              </div>
            </form>
          )}
        </aside>
      </div>
    </div>
  );
}
