import type { CandidateProfile } from '@workbridge/domain';

/** Contracts mirrored from apps/agent-runtime ApplicationService (DraftView / SubmitView). */
export type GateCode = 'critical_gap' | 'unverified_credential' | 'bias_alert' | 'infeasible_transport';
export interface GateReason { code: GateCode; detail: string }
export interface DraftFragment { source: 'evidence' | 'vacancy' | 'match'; evidenceIds: string[]; text: string }
export interface EvidenceItem {
  id: string;
  kind: 'experience' | 'skill' | 'education' | 'certification';
  text: string;
  credentialStatus: 'verified' | 'unverified' | 'not_applicable';
}
export interface HistoryEntry { action: string; actorRole: 'candidate' | 'employer' | 'counselor'; timestamp: string; reason: string }
export type InterviewState = 'pending_employer_approval' | 'approved' | 'rejected';

export interface DraftView {
  draftId: string;
  candidateId: string;
  vacancyId: string;
  employerOrgId?: string;
  traceId: string;
  vacancyTitle: string;
  candidateDisplayName?: string;
  evidence: EvidenceItem[];
  /** Full declared list. `evidence` is only the selection, so unchecked items live here. */
  availableEvidence?: EvidenceItem[];
  status: 'open' | 'rejected' | 'submitted';
  documents: { cv: DraftFragment[]; coverLetter: DraftFragment[]; application: DraftFragment[] };
  counselorGate: GateReason[];
  candidateApproved: boolean;
  counselorApproved: boolean;
  history: HistoryEntry[];
  submissionId?: string;
  interview?: InterviewState;
}

export interface SubmitView {
  submissionId: string;
  draftId: string;
  replayed: boolean;
  interview: InterviewState;
}

/** Interview decision returned by GET /drafts/:id/submission and copied onto the draft. */
export interface SubmissionRecord { submissionId: string; interview: InterviewState; submittedAt: string }

export type ApplicationStatus =
  | 'rejected'
  | 'interview_approved'
  | 'interview_rejected'
  | 'sent'
  | 'draft'
  | 'counselor_review'
  | 'ready';

export interface StatusPresentation {
  label: string;
  tone: 'neutral' | 'success' | 'warning' | 'danger' | 'accent';
  /** Sticker colour token used by list rows and the detail header. */
  color: 'yellow' | 'pink' | 'mint' | 'sky' | 'muted';
  hint: string;
}

export const STATUS_PRESENTATION: Record<ApplicationStatus, StatusPresentation> = {
  rejected: { label: 'Rechazada', tone: 'danger', color: 'pink', hint: 'Esta postulación fue rechazada y no se puede enviar.' },
  interview_approved: { label: 'Entrevista aprobada', tone: 'success', color: 'mint', hint: 'La empresa te contactará.' },
  interview_rejected: { label: 'No avanzó', tone: 'neutral', color: 'muted', hint: 'Esta vez no avanzó. Mira tu ruta para prepararte mejor.' },
  sent: { label: 'Enviada', tone: 'accent', color: 'sky', hint: 'La empresa está revisando tu postulación.' },
  draft: { label: 'Borrador', tone: 'warning', color: 'yellow', hint: 'Revisa y aprueba tu postulación.' },
  counselor_review: { label: 'En revisión del orientador', tone: 'warning', color: 'yellow', hint: 'Tu orientador/a todavía está revisando esta postulación.' },
  ready: { label: 'Lista para enviar', tone: 'success', color: 'mint', hint: 'Todo está listo. Tú decides cuándo enviarla.' },
};

/** First matching row of the status table in ux-flows.md wins. */
export function deriveStatus(draft: DraftView, submission?: { interview?: InterviewState | null } | null): ApplicationStatus {
  if (draft.status === 'rejected') return 'rejected';
  if (draft.status === 'submitted') {
    if (submission?.interview === 'approved') return 'interview_approved';
    if (submission?.interview === 'rejected') return 'interview_rejected';
    return 'sent';
  }
  if (!draft.candidateApproved) return 'draft';
  if (draft.counselorGate.length > 0 && !draft.counselorApproved) return 'counselor_review';
  return 'ready';
}

export function gateCopy(reason: GateReason): string {
  switch (reason.code) {
    case 'critical_gap':
      return `Te falta un requisito importante para este puesto: ${reason.detail.replace(/[.\s]+$/, '')}.`;
    case 'unverified_credential':
      return 'Una de tus certificaciones todavía no se pudo verificar.';
    case 'bias_alert':
      return 'La vacante tiene un requisito que debemos revisar para que sea justo contigo.';
    case 'infeasible_transport':
      return 'El traslado a este trabajo parece muy difícil con tus opciones de transporte.';
  }
}

export type ErrorAction = 'none' | 'sign_in' | 'home' | 'refresh' | 'focus_approve' | 'show_sent' | 'show_reason' | 'revert';
export interface ErrorCopy { message: string; action: ErrorAction }

const SIGN_IN_COPY: ErrorCopy = { message: 'Tu sesión terminó. Ingresa de nuevo.', action: 'sign_in' };
const FORBIDDEN_COPY: ErrorCopy = { message: 'No tienes acceso a esta página.', action: 'home' };

const ERROR_COPY: Record<string, ErrorCopy> = {
  candidate_approval_required: { message: 'Primero aprueba tu postulación.', action: 'focus_approve' },
  counselor_approval_required: { message: 'Tu orientador/a todavía está revisando esta postulación.', action: 'refresh' },
  already_submitted: { message: 'Esta postulación ya fue enviada.', action: 'show_sent' },
  draft_rejected: { message: 'Esta postulación fue rechazada y no se puede enviar.', action: 'show_reason' },
  draft_closed: { message: 'Esta postulación ya no se puede modificar.', action: 'refresh' },
  unknown_evidence: { message: 'Solo puedes usar experiencias y certificados que ya declaraste.', action: 'revert' },
  invented_evidence: { message: 'Solo puedes usar experiencias y certificados que ya declaraste.', action: 'revert' },
  invalid_session: SIGN_IN_COPY,
  expired_session: SIGN_IN_COPY,
  unauthenticated: SIGN_IN_COPY,
  forbidden: FORBIDDEN_COPY,
  not_found: { message: 'No encontramos esta postulación.', action: 'none' },
  application_runtime_unavailable: { message: 'El servicio de postulaciones no está disponible por ahora. Intenta más tarde.', action: 'none' },
};

export const NETWORK_ERROR_MESSAGE = 'Parece que no hay conexión. Revisa tu internet y vuelve a intentar.';
export const GENERIC_ERROR_MESSAGE = 'No pudimos completar la acción. Intenta de nuevo.';

export function errorCopy(error: unknown): ErrorCopy {
  const api = (error as { apiError?: { code?: string; status?: number } } | null)?.apiError;
  if (api) {
    const mapped = api.code ? ERROR_COPY[api.code] : undefined;
    if (mapped) return mapped;
    if (api.status === 401) return SIGN_IN_COPY;
    if (api.status === 403) return FORBIDDEN_COPY;
    return { message: GENERIC_ERROR_MESSAGE, action: 'none' };
  }
  if (error instanceof TypeError) return { message: NETWORK_ERROR_MESSAGE, action: 'none' };
  return { message: GENERIC_ERROR_MESSAGE, action: 'none' };
}

export function signInHref(next: string): string {
  return `/ingresar?next=${encodeURIComponent(next.startsWith('/') ? next : '/')}`;
}

/** Newest rejection entry: who rejected and why (shown for status "Rechazada"). */
export function rejectionInfo(draft: DraftView): { role: HistoryEntry['actorRole']; reason: string } | null {
  const entry = [...draft.history].reverse().find((item) => item.action === 'rejection');
  return entry ? { role: entry.actorRole, reason: entry.reason } : null;
}

export function submittedAt(draft: DraftView, record?: SubmissionRecord | null): string | null {
  if (record?.submittedAt) return record.submittedAt;
  const entry = [...draft.history].reverse().find((item) => item.action === 'submission');
  return entry?.timestamp ?? null;
}

export function lastActivity(draft: DraftView, record?: SubmissionRecord | null): string | null {
  const stamps = draft.history.map((item) => item.timestamp);
  if (record?.submittedAt) stamps.push(record.submittedAt);
  return stamps.sort().at(-1) ?? null;
}

export function formatWhen(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('es-PA', { dateStyle: 'medium', timeStyle: 'short' });
}

export function formatDay(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('es-PA', { dateStyle: 'long' });
}

/** Relative "hace 2 h" copy for the list; falls back to the date past a week. */
export function relativeTime(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const minutes = Math.max(0, Math.round((now.getTime() - then) / 60_000));
  if (minutes < 1) return 'hace un momento';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  if (days <= 7) return `hace ${days} ${days === 1 ? 'día' : 'días'}`;
  return formatDay(iso);
}

export const HISTORY_ACTION_LABELS: Record<string, string> = {
  correction: 'ajustó la evidencia',
  approval: 'aprobó',
  rejection: 'rechazó',
  submission: 'envió la postulación',
};
export const HISTORY_ROLE_LABELS = { candidate: 'Tú', counselor: 'Tu orientador/a', employer: 'La empresa' } as const;

export const EVIDENCE_KIND_LABELS: Record<EvidenceItem['kind'], string> = {
  experience: 'Experiencia',
  skill: 'Habilidad',
  education: 'Estudio',
  certification: 'Certificación',
};

export const VERIFICATION_COPY: Record<EvidenceItem['credentialStatus'], string> = {
  verified: 'Verificada',
  unverified: 'Sin verificar',
  not_applicable: 'Declarada',
};

export function certificationStatus(status: string): EvidenceItem['credentialStatus'] {
  return status === 'verified' ? 'verified' : 'unverified';
}

/**
 * Evidence the candidate declared, in the shape ApplicationService accepts.
 * Certifications map to verified/unverified; every other kind is `not_applicable`
 * (same rule as toApplicationEvidence in agent-runtime).
 */
export function evidenceFromProfile(profile: Pick<CandidateProfile, 'experiences' | 'education' | 'certifications' | 'skills'>): EvidenceItem[] {
  const items: EvidenceItem[] = [];
  const seen = new Set<string>();
  const push = (item: EvidenceItem) => {
    if (!item.id || !item.text.trim() || seen.has(item.id)) return;
    seen.add(item.id);
    items.push(item);
  };
  for (const experience of profile.experiences ?? []) {
    const head = [experience.title, experience.organization].filter(Boolean).join(' · ');
    push({
      id: experience.id,
      kind: 'experience',
      text: experience.description ? `${head}: ${experience.description}` : head,
      credentialStatus: 'not_applicable',
    });
  }
  for (const education of profile.education ?? []) {
    push({ id: education.id, kind: 'education', text: `${education.program} · ${education.institution}`, credentialStatus: 'not_applicable' });
  }
  for (const certification of profile.certifications ?? []) {
    push({
      id: certification.id,
      kind: 'certification',
      text: certification.issuer ? `${certification.name} · ${certification.issuer}` : certification.name,
      credentialStatus: certificationStatus(certification.status),
    });
  }
  for (const skill of profile.skills ?? []) {
    const name = skill.canonical_name.trim();
    if (!skill.skill_id || !name) continue;
    push({
      id: skill.skill_id,
      kind: 'skill',
      text: skill.level > 0 ? `${name} · nivel ${skill.level}` : name,
      credentialStatus: 'not_applicable',
    });
  }
  return items;
}
