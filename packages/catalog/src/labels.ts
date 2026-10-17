import type { ContractType, ExclusionReason, WorkModality } from './types';

/**
 * Single source of truth for the Spanish display labels of the shared enums.
 * The exploration reasons lower-case these inline; the dashboard renders them
 * capitalized. Keeping one map here avoids the library and the UI drifting.
 */
export const MODALITY_LABELS: Record<WorkModality, string> = {
  onsite: 'Presencial',
  hybrid: 'Híbrida',
  remote: 'Remota',
};

export const CONTRACT_LABELS: Record<ContractType, string> = {
  full_time: 'Tiempo completo',
  part_time: 'Medio tiempo',
  fixed_term: 'Plazo fijo',
  internship: 'Pasantía',
  temporary: 'Temporal',
  freelance: 'Independiente',
};

/**
 * Spanish display labels for exclusion reasons, in the canonical priority order
 * (staleness first). This map is the single source of truth for *both* the
 * labels and the order: adding a reason means adding one entry here, and the
 * `Record<ExclusionReason, string>` type forces it to be exhaustive.
 */
export const EXCLUSION_LABELS: Record<ExclusionReason, string> = {
  stale: 'Desactualizada',
  modality: 'Modalidad',
  location: 'Ubicación',
  contract: 'Contrato',
  schedule: 'Horario',
  salary: 'Salario',
};

/** Canonical exclusion priority, derived from `EXCLUSION_LABELS` (one source, not two). */
export const EXCLUSION_ORDER = Object.keys(EXCLUSION_LABELS) as ExclusionReason[];
