import type { CredentialStatus, GateCode } from '../../lib/api/applications';

export const GATE_LABELS: Record<GateCode, string> = {
  critical_gap: 'Brecha crítica',
  unverified_credential: 'Credencial sin verificar',
  bias_alert: 'Alerta de sesgo',
  infeasible_transport: 'Transporte inviable',
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

export const ROLE_LABELS = { candidate: 'Candidato/a', counselor: 'Orientación', employer: 'Empresa' } as const;

export const MIN_REASON_LENGTH = 10;

export function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('es-PA', { dateStyle: 'medium', timeStyle: 'short' });
}
