import type { CredentialStatus, GateCode } from '../../lib/api/applications';

// Counselor labels per ux-flows.md, section "Gate reasons".
export const GATE_LABELS: Record<GateCode, string> = {
  critical_gap: 'Brecha crítica',
  unverified_credential: 'Credencial sin verificar',
  bias_alert: 'Alerta de sesgo',
  infeasible_transport: 'Transporte inviable',
};

/** What to look at for each gate (guidance for the reviewer, not a rule the UI enforces). */
export const GATE_HINTS: Record<GateCode, string> = {
  critical_gap: 'Revisa si el requisito que falta realmente excluye a la persona.',
  unverified_credential: 'Compara la credencial con la evidencia declarada antes de decidir.',
  bias_alert: 'Revisa si el requisito de la vacante es justo para la persona.',
  infeasible_transport: 'Confirma si el traslado es viable con sus opciones de transporte.',
};

export const VERIFICATION_LABELS: Record<CredentialStatus, string> = {
  verified: 'Verificada',
  declared: 'Declarada',
  not_applicable: 'Declarada',
  unverified: 'Sin verificar',
  rejected: 'Rechazada',
};

export const ACTION_LABELS: Record<string, string> = {
  correction: 'corrigió el borrador',
  approval: 'aprobó',
  rejection: 'rechazó',
  submission: 'envió la postulación',
};

export const SOURCE_LABELS = { evidence: 'Evidencia', vacancy: 'Vacante', match: 'Coincidencia' } as const;

export const ROLE_LABELS = { candidate: 'Candidato/a', counselor: 'Orientación', employer: 'Empresa' } as const;

export const MIN_REASON_LENGTH = 10;

export function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('es-PA', { dateStyle: 'medium', timeStyle: 'short' });
}
