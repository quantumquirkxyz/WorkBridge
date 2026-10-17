import type { ContractType, WorkModality } from './types';

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
