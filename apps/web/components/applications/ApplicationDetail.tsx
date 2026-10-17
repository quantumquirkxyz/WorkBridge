'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ArrowLeft, Route, Send } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { Label } from '../ui/label';
import { Skeleton } from '../ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Textarea } from '../ui/textarea';
import { useDraftActions, useMyDraft } from '../../lib/applications-queries';
import {
  EVIDENCE_KIND_LABELS,
  HISTORY_ACTION_LABELS,
  HISTORY_ROLE_LABELS,
  STATUS_PRESENTATION,
  VERIFICATION_COPY,
  deriveStatus,
  errorCopy,
  formatDay,
  formatWhen,
  gateCopy,
  rejectionInfo,
  signInHref,
  submittedAt,
  type DraftFragment,
  type DraftView,
  type ErrorCopy,
  type EvidenceItem,
} from '../../lib/applications-status';
import { QueryFailure, StatusBadge, useCurrentNext } from './shared';

const MIN_REJECT_REASON = 5;

function DetailSkeleton() {
  return (
    <div className="app-skeleton-list" role="status" aria-label="Cargando tu postulación">
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-10 w-2/3" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}

function Fragments({ items }: { items: DraftFragment[] }) {
  if (items.length === 0) return <p className="note-sticker">Todavía no hay contenido. Agrega evidencia para armar este documento.</p>;
  return (
    <div className="grid gap-2">
      {items.map((item, index) => (
        <p key={index} className="doc-fragment" data-source={item.source}>{item.text}</p>
      ))}
    </div>
  );
}

function VerificationTag({ status }: { status: EvidenceItem['credentialStatus'] }) {
  return (
    <Badge tone={status === 'verified' ? 'success' : status === 'unverified' ? 'warning' : 'neutral'} className="sticker-tag">
      {VERIFICATION_COPY[status]}
    </Badge>
  );
}

export function ApplicationDetail({ draftId }: { draftId: string }) {
  const { data: draft, isPending, isError, error, refetch } = useMyDraft(draftId);
  return (
    <main className="app-page">
      <Link href="/postulaciones" className="back-link app-back"><ArrowLeft className="size-4" aria-hidden="true" /> Mis postulaciones</Link>
      {isPending ? <DetailSkeleton /> : isError ? (
        <QueryFailure error={error} onRetry={() => void refetch()} title="No pudimos cargar esta postulación" />
      ) : (
        <DraftScreen draft={draft} onRefresh={() => void refetch()} />
      )}
    </main>
  );
}

function DraftScreen({ draft, onRefresh }: { draft: DraftView; onRefresh: () => void }) {
  const router = useRouter();
  const next = useCurrentNext();
  const actions = useDraftActions(draft);
  const [selected, setSelected] = useState<string[]>(() => draft.evidence.map((item) => item.id));
  const [message, setMessage] = useState<string>('');
  const [failure, setFailure] = useState<ErrorCopy | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [tab, setTab] = useState('cv');
  const submitKey = useRef<string | null>(null);
  const approveRef = useRef<HTMLButtonElement>(null);

  const serverIds = draft.evidence.map((item) => item.id).join('|');
  useEffect(() => { setSelected(serverIds ? serverIds.split('|') : []); }, [serverIds]);

  const pool = draft.availableEvidence ?? draft.evidence;
  const status = deriveStatus(draft, draft);
  const presentation = STATUS_PRESENTATION[status];
  const isOpen = draft.status === 'open';
  const dirty = selected.length !== draft.evidence.length || selected.some((id) => !draft.evidence.some((item) => item.id === id));
  const busy = actions.correct.isPending || actions.approve.isPending || actions.reject.isPending || actions.submit.isPending;
  const rejection = rejectionInfo(draft);
  const sentOn = submittedAt(draft);

  function fail(error: unknown, revert = false) {
    const copy = errorCopy(error);
    setFailure(copy);
    if (copy.action === 'sign_in') router.replace(signInHref(next));
    if (copy.action === 'home') router.replace('/');
    if (copy.action === 'focus_approve') requestAnimationFrame(() => approveRef.current?.focus());
    if (copy.action === 'revert' || revert) setSelected(draft.evidence.map((item) => item.id));
    if (copy.action === 'refresh' || copy.action === 'show_sent' || copy.action === 'show_reason') {
      actions.submit.reset();
      onRefresh();
    }
  }

  function toggle(id: string, checked: boolean) {
    setFailure(null);
    setMessage('');
    setSelected((current) => (checked ? [...new Set([...current, id])] : current.filter((value) => value !== id)));
  }

  function saveCorrection() {
    setFailure(null);
    actions.correct.mutate(selected, {
      onSuccess: () => setMessage('Guardamos tus cambios. Vuelve a aprobar tu postulación.'),
      onError: (error) => fail(error, true),
    });
  }

  function approve() {
    setFailure(null);
    actions.approve.mutate(undefined, {
      onSuccess: () => setMessage('Aprobaste tu postulación.'),
      onError: (error) => fail(error),
    });
  }

  function reject() {
    const reason = rejectReason.trim();
    if (reason.length < MIN_REJECT_REASON) return;
    setFailure(null);
    actions.reject.mutate(reason, {
      onSuccess: () => { setRejectOpen(false); setRejectReason(''); setMessage('Rechazaste esta postulación.'); },
      onError: (error) => { setRejectOpen(false); fail(error); },
    });
  }

  function submit() {
    // Same key on every retry of this confirmation so a dropped response never double-sends.
    submitKey.current ??= crypto.randomUUID();
    setFailure(null);
    actions.submit.mutate(submitKey.current, {
      onSuccess: () => { setConfirmOpen(false); submitKey.current = null; setMessage('Enviamos tu postulación.'); },
      onError: (error) => { setConfirmOpen(false); fail(error); },
    });
  }

  const gate = draft.counselorGate;
  const showGate = isOpen && gate.length > 0;
  const toneStyle = { ['--status' as string]: `var(--${presentation.color})` };

  return (
    <div className="app-detail">
      <header className="app-hero" style={toneStyle}>
        <p className="eyebrow">Postulación</p>
        <h1 className="app-title">{draft.vacancyTitle}</h1>
        <div className="app-hero-meta">
          <StatusBadge status={status} />
          <span className="app-hero-hint">{presentation.hint}</span>
        </div>
        {draft.history.length > 0 ? (
          <details className="app-timeline-wrap">
            <summary>Historial ({draft.history.length})</summary>
            <ol className="timeline">
              {draft.history.map((entry, index) => (
                <li key={index} className="text-sm">
                  <strong>{HISTORY_ROLE_LABELS[entry.actorRole]}</strong> {HISTORY_ACTION_LABELS[entry.action] ?? entry.action} ·{' '}
                  <time dateTime={entry.timestamp}>{formatWhen(entry.timestamp)}</time>
                </li>
              ))}
            </ol>
          </details>
        ) : null}
      </header>

      <div className="sr-only" role="status" aria-live="polite">{message}</div>

      <div className="app-columns">
        <section className="app-docs" aria-label="Documentos de tu postulación">
          {showGate ? (
            <aside className="app-gate" aria-labelledby="app-gate-title">
              <h2 id="app-gate-title" className="app-gate-title"><AlertTriangle className="size-4" aria-hidden="true" /> Necesita revisión de tu orientador/a</h2>
              <ul>
                {gate.map((reason) => <li key={`${reason.code}-${reason.detail}`}>{gateCopy(reason)}</li>)}
              </ul>
            </aside>
          ) : null}

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="cv">CV</TabsTrigger>
              <TabsTrigger value="carta">Carta</TabsTrigger>
              <TabsTrigger value="evidencia">Evidencia</TabsTrigger>
            </TabsList>
            <TabsContent value="cv"><Fragments items={draft.documents.cv} /></TabsContent>
            <TabsContent value="carta"><Fragments items={draft.documents.coverLetter} /></TabsContent>
            <TabsContent value="evidencia">
              <p className="hint">
                {isOpen
                  ? 'Solo puedes usar experiencias y certificados que ya declaraste. Si cambias algo, tendrás que volver a aprobar.'
                  : 'Esta es la evidencia que se usó en tu postulación.'}
              </p>
              <ul className="app-evidence" aria-label="Evidencia">
                {(isOpen ? pool : draft.evidence).map((item) => {
                  const checked = isOpen ? selected.includes(item.id) : true;
                  return (
                    <li key={item.id} className="evidence-item app-evidence-item">
                      {isOpen ? (
                        <Checkbox id={`ev-${item.id}`} checked={checked} disabled={busy} onCheckedChange={(value) => toggle(item.id, value === true)} />
                      ) : null}
                      <Label htmlFor={isOpen ? `ev-${item.id}` : undefined} className="app-evidence-text">
                        <span>{item.text}</span>
                        <span className="app-evidence-kind">{EVIDENCE_KIND_LABELS[item.kind]}</span>
                      </Label>
                      <VerificationTag status={item.credentialStatus} />
                    </li>
                  );
                })}
              </ul>
              {isOpen && dirty ? (
                <div className="app-save-bar">
                  <p>{selected.length === 0 ? 'Elige al menos una experiencia o certificado.' : draft.candidateApproved ? 'Al guardar, tendrás que aprobar de nuevo.' : 'Tienes cambios sin guardar.'}</p>
                  <Button type="button" variant="secondary" disabled={busy || selected.length === 0} onClick={saveCorrection}>
                    {actions.correct.isPending ? 'Guardando…' : 'Guardar cambios'}
                  </Button>
                </div>
              ) : null}
            </TabsContent>
          </Tabs>
        </section>

        <aside className="app-actions" aria-label="Acciones de la postulación">
          {failure ? <p role="alert" className="error app-action-error">{failure.message}</p> : null}

          {status === 'draft' ? (
            <>
              <p className="app-actions-copy">Revisa tu CV, tu carta y tu evidencia. Si todo está bien, apruébala.</p>
              <Button ref={approveRef} type="button" size="lg" disabled={busy || dirty} onClick={approve}>
                {actions.approve.isPending ? 'Aprobando…' : 'Aprobar mi postulación'}
              </Button>
              {dirty ? <p className="hint">Guarda tus cambios antes de aprobar.</p> : null}
            </>
          ) : null}

          {status === 'counselor_review' ? (
            <p className="status-banner app-banner" role="status">Tu orientador/a está revisando esta postulación. Te avisaremos aquí cuando esté lista.</p>
          ) : null}

          {status === 'ready' ? (
            <>
              <p className="status-banner status-banner-mint app-banner">Lista para enviar. Tú decides cuándo.</p>
              <Button type="button" size="lg" disabled={busy} onClick={() => setConfirmOpen(true)}>
                <Send aria-hidden="true" /> Enviar postulación
              </Button>
            </>
          ) : null}

          {status === 'sent' || status === 'interview_approved' || status === 'interview_rejected' ? (
            <div className="app-sent">
              {sentOn ? <p className="app-sent-line">Enviada el {formatDay(sentOn)}</p> : <p className="app-sent-line">Enviada</p>}
              {status === 'interview_approved' ? <p className="status-banner status-banner-mint app-banner">Entrevista aprobada. La empresa te contactará.</p> : null}
              {status === 'sent' ? <p className="hint">La empresa está revisando tu postulación. Verás aquí cuando haya respuesta.</p> : null}
              {status === 'interview_rejected' ? (
                <>
                  <p className="app-actions-copy">Esta vez no avanzó. Puedes prepararte mejor con tu ruta de capacitación.</p>
                  <Button asChild><Link href="/ruta"><Route aria-hidden="true" /> Ver mi ruta</Link></Button>
                </>
              ) : null}
            </div>
          ) : null}

          {status === 'rejected' ? (
            <div className="app-rejected" role="status">
              <p className="app-sent-line">Rechazada</p>
              {rejection ? (
                <p>
                  {rejection.role === 'candidate' ? 'La rechazaste tú' : `La rechazó ${HISTORY_ROLE_LABELS[rejection.role].toLowerCase()}`}
                  {rejection.reason ? <>: “{rejection.reason}”</> : '.'}
                </p>
              ) : <p>Esta postulación fue rechazada y no se puede enviar.</p>}
              <Button asChild variant="outline"><Link href="/vacantes">Ver otras vacantes</Link></Button>
            </div>
          ) : null}

          {isOpen ? (
            <Button type="button" variant="outline" disabled={busy} onClick={() => setRejectOpen(true)}>Rechazar</Button>
          ) : null}
        </aside>
      </div>

      <Dialog open={rejectOpen} onOpenChange={(open) => { if (!actions.reject.isPending) setRejectOpen(open); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar esta postulación</DialogTitle>
            <DialogDescription>No se enviará y no podrás retomarla. Cuéntanos por qué.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="reject-reason">Motivo*</Label>
            <Textarea id="reject-reason" value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} required aria-describedby="reject-help" />
            <p id="reject-help" className="hint">Escribe al menos {MIN_REJECT_REASON} caracteres.</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRejectOpen(false)}>Cancelar</Button>
            <Button type="button" variant="destructive" disabled={rejectReason.trim().length < MIN_REJECT_REASON || actions.reject.isPending} onClick={reject}>
              {actions.reject.isPending ? 'Rechazando…' : 'Rechazar postulación'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={(open) => { if (!actions.submit.isPending) setConfirmOpen(open); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Enviar tu postulación a {draft.vacancyTitle}?</AlertDialogTitle>
            <AlertDialogDescription>
              Se compartirán tu CV, tu carta y tu evidencia con la empresa. No se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {actions.submit.isError ? <p role="alert" className="error">{errorCopy(actions.submit.error).message}</p> : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actions.submit.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={actions.submit.isPending}
              onClick={(event) => { event.preventDefault(); submit(); }}
            >
              {actions.submit.isPending ? 'Enviando…' : 'Sí, enviar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
