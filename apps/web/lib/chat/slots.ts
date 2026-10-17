/** Slot agenda (ux-flows.md#slot-agenda). Priority is array order within each phase. */
export type SlotId =
  | 'greeting'
  | 'cv_source'
  | 'experiences'
  | 'experience_tasks'
  | 'experience_duration'
  | 'experiences_more'
  | 'education'
  | 'target_roles'
  | 'zone'
  | 'modality'
  | 'schedule'
  | 'minimum_salary_usd'
  | 'willing_to_train';

export type ChatPhase = 'profile' | 'preferences' | 'done';

export interface SlotChip {
  label: string;
  value?: unknown;
  kind: 'answer' | 'confirm' | 'change' | 'retry';
}

export interface SlotDefinition {
  id: SlotId;
  phase: 'profile' | 'preferences';
  question: string;
  chips: SlotChip[];
}

const answer = (label: string, value?: unknown): SlotChip =>
  value === undefined ? { label, kind: 'answer' } : { label, value, kind: 'answer' };
const labels = (...items: string[]): SlotChip[] => items.map((l) => answer(l));

export const SLOTS: readonly SlotDefinition[] = [
  {
    id: 'greeting',
    phase: 'profile',
    question:
      '¡Hola! Soy Puente 👋 Te voy a hacer unas preguntas para conocer lo que sabes hacer. También puedes preguntarme lo que quieras. ¿Cómo te llamo?',
    chips: labels('Prefiero no decirlo'),
  },
  {
    id: 'cv_source',
    phase: 'profile',
    question: '¿Tienes un CV o una hoja de vida?',
    chips: labels('Sí, lo subo 📎', 'No tengo / prefiero contarte'),
  },
  {
    id: 'experiences',
    phase: 'profile',
    question:
      '¿Has trabajado o ayudado en algún lugar? Vale todo: negocio familiar, voluntariado, trabajos por tu cuenta, proyectos del colegio…',
    chips: labels('Todavía no'),
  },
  {
    id: 'experience_tasks',
    phase: 'profile',
    question: '¿Qué hacías ahí?',
    chips: labels(
      'Atender clientes',
      'Caja / cobrar',
      'Inventario',
      'Redes sociales',
      'Reparar computadoras o celulares',
      'Organizar documentos',
    ),
  },
  {
    id: 'experience_duration',
    phase: 'profile',
    question: '¿Por cuánto tiempo lo hiciste?',
    chips: labels('Menos de 3 meses', '3 a 12 meses', 'Más de un año', 'Todavía lo hago'),
  },
  {
    id: 'experiences_more',
    phase: 'profile',
    question: '¿Tienes otra experiencia que quieras contarme?',
    chips: labels('Sí, otra', 'No, sigamos'),
  },
  {
    id: 'education',
    phase: 'profile',
    question: '¿Qué has estudiado o estás estudiando?',
    chips: labels('Secundaria / bachiller', 'Técnico', 'Universidad', 'Cursos en línea'),
  },
  {
    id: 'target_roles',
    phase: 'profile',
    question: '¿En qué te gustaría trabajar?',
    chips: [
      answer('Atención al cliente', 'Atención al cliente'),
      answer('Soporte técnico', 'Soporte técnico'),
      answer('Administrativo', 'Administrativo'),
      answer('Ventas', 'Ventas'),
      answer('Otro', 'Otro'),
    ],
  },
  {
    id: 'zone',
    phase: 'preferences',
    question: '¿En qué zona te queda bien trabajar?',
    chips: [
      answer('Panamá (ciudad)', 'Panamá (ciudad)'),
      answer('San Miguelito', 'San Miguelito'),
      answer('Panamá Oeste', 'Panamá Oeste'),
      answer('Otra', 'Otra'),
    ],
  },
  {
    id: 'modality',
    phase: 'preferences',
    question: '¿Cómo prefieres trabajar?',
    chips: [answer('Presencial', 'onsite'), answer('Híbrido', 'hybrid'), answer('Desde casa', 'remote')],
  },
  {
    id: 'schedule',
    phase: 'preferences',
    question: '¿Qué horario te funciona?',
    chips: [
      answer('Lunes a viernes, de día', {
        days: [1, 2, 3, 4, 5],
        from: '08:00',
        to: '17:00',
        weekly_hours: 40,
        contract_type: 'full_time',
      }),
      answer('Medio tiempo', {
        days: [1, 2, 3, 4, 5],
        from: '08:00',
        to: '13:00',
        weekly_hours: 25,
        contract_type: 'part_time',
      }),
      answer('Fines de semana', {
        days: [6, 0],
        from: '08:00',
        to: '17:00',
        weekly_hours: 16,
        contract_type: 'part_time',
      }),
    ],
  },
  {
    id: 'minimum_salary_usd',
    phase: 'preferences',
    question: '¿Cuál es el salario mínimo mensual que aceptarías?',
    chips: [answer('USD 400', 400), answer('USD 600', 600), answer('USD 800', 800), answer('Otro')],
  },
  {
    id: 'willing_to_train',
    phase: 'preferences',
    question: 'Si te falta algo, ¿te animarías a tomar cursos cortos?',
    chips: [answer('¡Sí!', true), answer('Por ahora no', false)],
  },
];

export const SLOT_IDS: readonly SlotId[] = SLOTS.map((s) => s.id);

export function slotDefinition(id: SlotId): SlotDefinition {
  const def = SLOTS.find((s) => s.id === id);
  if (!def) throw new Error(`Unknown slot ${id}`);
  return def;
}

export function isSlotId(value: unknown): value is SlotId {
  return typeof value === 'string' && (SLOT_IDS as readonly string[]).includes(value);
}

/** Defaults applied when a preference slot is skipped. */
export const SKIP_DEFAULTS: Partial<Record<SlotId, unknown>> = {
  modality: 'onsite',
  schedule: SLOTS.find((s) => s.id === 'schedule')?.chips[0]?.value,
  minimum_salary_usd: 600,
  willing_to_train: true,
};
