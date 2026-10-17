import type { ContractType, TransportMode, WorkModality } from '@workbridge/domain';
import { CONTRACT_LABELS, MODALITY_LABELS } from '@workbridge/catalog';

export const DAY_LABELS: Array<{ value: number; label: string }> = [
  { value: 1, label: 'Lun' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Mié' },
  { value: 4, label: 'Jue' },
  { value: 5, label: 'Vie' },
  { value: 6, label: 'Sáb' },
  { value: 0, label: 'Dom' },
];

export const MODALITY_OPTIONS: Array<{ value: WorkModality; label: string }> = [
  { value: 'onsite', label: MODALITY_LABELS.onsite },
  { value: 'hybrid', label: MODALITY_LABELS.hybrid },
  { value: 'remote', label: MODALITY_LABELS.remote },
];

export const CONTRACT_OPTIONS: Array<{ value: ContractType; label: string }> = [
  { value: 'full_time', label: CONTRACT_LABELS.full_time },
  { value: 'part_time', label: CONTRACT_LABELS.part_time },
  { value: 'fixed_term', label: CONTRACT_LABELS.fixed_term },
  { value: 'internship', label: CONTRACT_LABELS.internship },
  { value: 'temporary', label: CONTRACT_LABELS.temporary },
  { value: 'freelance', label: CONTRACT_LABELS.freelance },
];

export const TRANSPORT_OPTIONS: Array<{ value: TransportMode; label: string }> = [
  { value: 'transit', label: 'Transporte público' },
  { value: 'driving', label: 'Auto' },
  { value: 'walking', label: 'A pie' },
  { value: 'cycling', label: 'Bicicleta' },
];
