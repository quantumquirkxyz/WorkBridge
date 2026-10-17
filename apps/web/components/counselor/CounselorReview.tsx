'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Skeleton } from '../ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Textarea } from '../ui/textarea';
import type { CounselorDecision, DraftFragment } from '../../lib/api/applications';
import { useCounselorDraft, useDecideDraft } from '../../lib/queries/applications';
import { GateBadges } from './GateBadges';
import { VerificationBadge } from './VerificationBadge';
import { ACTION_LABELS, MIN_REASON_LENGTH, ROLE_LABELS, formatWhen } from './labels';

function Fragments({ items }: { items: DraftFragment[] }) {
  if (items.length === 0) return <p className="text-muted-foreground">Sin contenido.</p>;
  return (
    <div className="grid gap-2">
      {items.map((item, index) => (
        <p key={index}>{item.text}</p>
      ))}
    </div>
  );
}

export function CounselorReview({ draftId }: { draftId: string }) {
  const { data: draft, isPending, isError } = useCounselorDraft(draftId);
  const decide = useDecideDraft({ draftId, traceId: draft?.traceId ?? '' });
  const [reason, setReason] = useState('');
  const [done, setDone] = useState<CounselorDecision | null>(null);

  if (isPending) return <Skeleton className="h-40 w-full" aria-label="Cargando postulación" />;
  if (isError) return <p role="alert">No pudimos cargar esta postulación.</p>;

  const trimmed = reason.trim();
  const tooShort = trimmed.length < MIN_REASON_LENGTH;
  const decided = draft.status !== 'open' || draft.counselorApproved || done !== null;

  const decidedMessage =
    done === 'rejections' || draft.status === 'rejected'
      ? 'Rechazaste esta postulación.'
      : draft.status === 'submitted'
        ? 'Esta postulación ya fue enviada.'
        : 'Aprobaste esta postulación.';

  function submit(decision: CounselorDecision) {
    if (tooShort) return;
    decide.mutate(
      { decision, reason: trimmed },
      {
        onSuccess: () => {
          setDone(decision);
          setReason('');
        },
      },
    );
  }

  return (
    <div className="grid gap-6">
      <Link href="/orientador" className="text-sm underline">
        Volver a pendientes
      </Link>
      <header className="grid gap-2">
        <h1 className="text-xl font-bold">
          {draft.candidateDisplayName ?? 'Candidato/a'} → {draft.vacancyTitle}
        </h1>
        <GateBadges reasons={draft.counselorGate} />
        <ul className="grid gap-1 text-sm">
          {draft.counselorGate.map((gate) => (
            <li key={`${gate.code}-${gate.detail}`}>{gate.detail}</li>
          ))}
        </ul>
      </header>

      <Tabs defaultValue="cv">
        <TabsList>
          <TabsTrigger value="cv">CV</TabsTrigger>
          <TabsTrigger value="carta">Carta</TabsTrigger>
          <TabsTrigger value="evidencia">Evidencia</TabsTrigger>
        </TabsList>
        <TabsContent value="cv">
          <Fragments items={draft.documents.cv} />
        </TabsContent>
        <TabsContent value="carta">
          <Fragments items={draft.documents.coverLetter} />
        </TabsContent>
        <TabsContent value="evidencia">
          <ul className="grid gap-2">
            {draft.evidence.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center gap-2">
                <span>{item.text}</span>
                <VerificationBadge status={item.credentialStatus} />
              </li>
            ))}
          </ul>
        </TabsContent>
      </Tabs>

      <section aria-labelledby="historial" className="grid gap-2">
        <h2 id="historial" className="font-semibold">
          Historial
        </h2>
        {draft.history.length === 0 ? (
          <p className="text-muted-foreground">Todavía no hay movimientos.</p>
        ) : (
          <ol className="grid gap-2 border-l pl-3">
            {draft.history.map((entry, index) => (
              <li key={index} className="text-sm">
                <strong>{ROLE_LABELS[entry.actorRole]}</strong> {ACTION_LABELS[entry.action] ?? entry.action} ·{' '}
                <time dateTime={entry.timestamp}>{formatWhen(entry.timestamp)}</time>
                {entry.reason ? <> · “{entry.reason}”</> : null}
              </li>
            ))}
          </ol>
        )}
      </section>

      {decided ? (
        <p role="status">
          {decidedMessage}
        </p>
      ) : (
        <form className="grid gap-3" onSubmit={(event) => event.preventDefault()}>
          <Label htmlFor="motivo">Motivo de tu decisión*</Label>
          <Textarea
            id="motivo"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            aria-describedby="motivo-ayuda"
            required
          />
          <p id="motivo-ayuda" className="text-sm text-muted-foreground">
            Escribe al menos {MIN_REASON_LENGTH} caracteres.
          </p>
          {decide.isError ? <p role="alert">No pudimos guardar tu decisión. Intenta de nuevo.</p> : null}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <Button type="button" variant="outline" disabled={tooShort || decide.isPending} onClick={() => submit('rejections')}>
              Rechazar
            </Button>
            <Button type="button" disabled={tooShort || decide.isPending} onClick={() => submit('approvals')}>
              Aprobar
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
