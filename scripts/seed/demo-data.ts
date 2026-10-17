import {
  makeCandidateId,
  makeId,
  type CandidateEducation,
  type CandidateExperience,
  type CandidatePreferences,
  type CandidateProfile,
  type CandidateSkill,
  type ContractType,
  type Evidence,
  type ExperienceType,
  type PreferenceAvailability,
  type PreferenceLocation,
  type Relevance,
  type SkillKind,
  type SkillLevel,
  type WorkModality,
} from '../../packages/domain/src/index';

/**
 * Synthetic WorkBridge accounts for local and demo databases.
 *
 * Student ids are Better Auth user ids. Profiles and preferences are stored
 * under `makeCandidateId(userId)`, which is the same key `/cuenta/inicio` and
 * the candidate APIs read after sign-in.
 *
 * Application drafts and employer decisions are not in Postgres (the runtime
 * keeps them in memory), so those journeys are represented by the account that
 * should walk them, not by a stored submission.
 */

export const DEMO_PASSWORD = 'Semilla2026!';
export const SEEDED_AT = '2026-10-16T15:00:00.000Z';

const SLOT_IDS = [
  'greeting',
  'cv_source',
  'experiences',
  'experience_tasks',
  'experience_duration',
  'experiences_more',
  'education',
  'target_roles',
  'zone',
  'modality',
  'schedule',
  'minimum_salary_usd',
  'willing_to_train',
] as const;

const TAXON: Record<string, { name: string; kind: SkillKind }> = {
  'plp:customer-service': { name: 'Atención al cliente', kind: 'soft' },
  'plp:communication': { name: 'Comunicación', kind: 'soft' },
  'plp:teamwork': { name: 'Trabajo en equipo', kind: 'soft' },
  'plp:responsibility': { name: 'Responsabilidad', kind: 'soft' },
  'plp:organization': { name: 'Organización', kind: 'soft' },
  'plp:attention-to-detail': { name: 'Atención al detalle', kind: 'soft' },
  'plp:problem-solving': { name: 'Resolución de problemas', kind: 'soft' },
  'plp:willingness-to-learn': { name: 'Disposición para aprender', kind: 'soft' },
  'plp:point-of-sale': { name: 'Punto de venta y caja', kind: 'technical' },
  'plp:inventory': { name: 'Control de inventario', kind: 'technical' },
  'plp:office-suite': { name: 'Ofimática', kind: 'technical' },
  'plp:excel': { name: 'Excel', kind: 'technical' },
  'plp:word': { name: 'Word', kind: 'technical' },
  'plp:data-entry': { name: 'Digitación de datos', kind: 'technical' },
  'plp:social-media': { name: 'Gestión de redes sociales', kind: 'technical' },
  'plp:hardware-troubleshooting': { name: 'Diagnóstico de hardware', kind: 'technical' },
  'plp:windows': { name: 'Windows', kind: 'technical' },
  'plp:networking-basics': { name: 'Redes básicas', kind: 'technical' },
  'plp:customer-support-tools': { name: 'Herramientas de soporte (mesa de ayuda)', kind: 'technical' },
};

const DAY: PreferenceAvailability = { days: [1, 2, 3, 4, 5], start_minute: 480, end_minute: 1020, weekly_hours: 40 };
const HALF: PreferenceAvailability = { days: [1, 2, 3, 4, 5], start_minute: 480, end_minute: 780, weekly_hours: 25 };
const WEEKEND: PreferenceAvailability = { days: [6, 0], start_minute: 480, end_minute: 1020, weekly_hours: 16 };

const SCHEDULE_DAY = { days: [1, 2, 3, 4, 5], from: '08:00', to: '17:00', weekly_hours: 40, contract_type: 'full_time' };
const SCHEDULE_HALF = { days: [1, 2, 3, 4, 5], from: '08:00', to: '13:00', weekly_hours: 25, contract_type: 'part_time' };
const SCHEDULE_WEEKEND = { days: [6, 0], from: '08:00', to: '17:00', weekly_hours: 16, contract_type: 'part_time' };

const CITY: PreferenceLocation = { country: 'PA', province: 'Panamá', district: 'Panamá', raw: 'Ciudad de Panamá' };
const ARRAIJAN: PreferenceLocation = { country: 'PA', province: 'Panamá', district: 'Arraiján', raw: 'Arraiján' };
const OESTE: PreferenceLocation = { country: 'PA', province: 'Panamá Oeste', district: 'La Chorrera', raw: 'La Chorrera' };
const MIGUELITO: PreferenceLocation = { country: 'PA', province: 'Panamá', district: null, raw: 'San Miguelito' };

export interface SeedAccount {
  userId: string;
  name: string;
  email: string;
  role: 'candidate' | 'employer' | 'counselor';
  employerOrgId: string | null;
}

export interface SeedOrganization {
  id: string;
  name: string;
}

export interface SeedChatSession {
  transcript: Array<{ role: 'user' | 'assistant'; content: string }>;
  slotState: Record<string, { state: 'missing' | 'filled' | 'proposed' | 'incomplete'; value?: unknown }>;
  llmTurns: number;
  capNoticeSent: boolean;
}

export interface SeedSavedSearch {
  searchId: string;
  candidateId: string;
  label: string;
  savedAt: string;
  preferences: CandidatePreferences;
  seenJobIds: string[];
}

export interface SeedStudent {
  /** Journey this account is meant to exercise. */
  flow: string;
  /** What a tester should see after signing in. */
  expect: string;
  account: SeedAccount;
  profile?: CandidateProfile;
  preferences?: CandidatePreferences;
  searches?: SeedSavedSearch[];
  visitedAt?: string;
  chat?: SeedChatSession;
}

export interface SeedEmployer {
  flow: string;
  expect: string;
  account: SeedAccount;
  organization: SeedOrganization;
}

export interface SeedCounselor {
  flow: string;
  expect: string;
  account: SeedAccount;
}

interface SkillInput {
  id: string;
  level: SkillLevel;
  term: string;
}

interface ExperienceInput {
  key: string;
  type: ExperienceType;
  title: string;
  organization?: string;
  description: string;
  started: string;
  ended?: string;
  ongoing?: boolean;
  where: string;
  relevance: Relevance;
  reason: string;
  skills: SkillInput[];
}

interface EducationInput {
  key: string;
  institution: string;
  program: string;
  level: CandidateEducation['level'];
  started: string;
  ended?: string;
  ongoing?: boolean;
}

function skillOf(input: SkillInput, evidenceId: string): CandidateSkill {
  const known = TAXON[input.id];
  if (!known) throw new Error(`Unknown seed skill ${input.id}`);
  return {
    skill_id: input.id,
    canonical_name: known.name,
    original_term: input.term,
    kind: known.kind,
    level: input.level,
    evidence_ids: [evidenceId],
    source: 'extracted',
    confidence: 0.86,
  };
}

function buildProfile(
  userId: string,
  input: {
    roles: string[];
    experiences: ExperienceInput[];
    education: EducationInput[];
    warnings?: string[];
    source?: 'text' | 'pdf' | 'audio_transcript';
  },
): CandidateProfile {
  const candidateId = makeCandidateId(userId);
  const evidence: Evidence[] = [];
  const experiences: CandidateExperience[] = [];
  const skills = new Map<string, CandidateSkill>();

  for (const item of input.experiences) {
    const evidenceId = `ev_${userId}_${item.key}`;
    evidence.push({
      id: evidenceId,
      claim: item.description,
      source: 'extracted',
      source_ref: `seed:${userId}:${item.key}`,
      excerpt: item.description,
      confidence: 0.9,
      captured_at: SEEDED_AT,
    });
    experiences.push({
      id: `exp_${userId}_${item.key}`,
      experience_type: item.type,
      title: item.title,
      ...(item.organization ? { organization: item.organization } : {}),
      description: item.description,
      started_at: item.started,
      ...(item.ended ? { ended_at: item.ended } : {}),
      ...(item.ongoing ? { ongoing: true } : {}),
      location: item.where,
      source: 'extracted',
      relevance: item.relevance,
      relevance_reason: item.reason,
      skill_ids: item.skills.map((skill) => skill.id),
      evidence_ids: [evidenceId],
      confidence: 0.88,
    });
    for (const skill of item.skills) {
      const next = skillOf(skill, evidenceId);
      const previous = skills.get(skill.id);
      if (!previous || next.level > previous.level) skills.set(skill.id, next);
      else if (!previous.evidence_ids.includes(evidenceId)) previous.evidence_ids.push(evidenceId);
    }
  }

  const education: CandidateEducation[] = input.education.map((item) => {
    const evidenceId = `ev_${userId}_${item.key}`;
    evidence.push({
      id: evidenceId,
      claim: `${item.program} en ${item.institution}`,
      source: 'declared',
      source_ref: `seed:${userId}:${item.key}`,
      confidence: 0.95,
      captured_at: SEEDED_AT,
    });
    return {
      id: `edu_${userId}_${item.key}`,
      institution: item.institution,
      program: item.program,
      level: item.level,
      started_at: item.started,
      ...(item.ended ? { ended_at: item.ended } : {}),
      ...(item.ongoing ? { ongoing: true } : {}),
      source: 'declared',
      evidence_ids: [evidenceId],
      confidence: 0.95,
    };
  });

  return {
    schema_version: '1.0.0',
    candidate_id: candidateId,
    locale: 'es-PA',
    created_at: SEEDED_AT,
    updated_at: SEEDED_AT,
    target_roles: input.roles,
    sources: [
      {
        kind: input.source ?? 'text',
        ref: `seed:chat:${userId}`,
        extraction_method: 'seed',
        extraction_confidence: 0.9,
        extracted_char_count: 480,
        extracted_at: SEEDED_AT,
      },
    ],
    skills: [...skills.values()],
    experiences,
    education,
    certifications: [],
    evidence,
    ...(input.warnings ? { warnings: input.warnings } : {}),
    trace_id: makeId('trace', userId),
  };
}

function buildPreferences(
  userId: string,
  input: {
    roles: string[];
    modality: WorkModality;
    location: PreferenceLocation;
    salary: number;
    availability: PreferenceAvailability;
    contracts: ContractType[];
    train: boolean;
    intern: boolean;
  },
): CandidatePreferences {
  const candidateId = makeCandidateId(userId);
  return {
    schema_version: '1.0.0',
    preferences_id: makeId('preferences', userId),
    candidate_id: candidateId,
    locale: 'es-PA',
    origin: 'candidate_explicit',
    created_at: SEEDED_AT,
    updated_at: SEEDED_AT,
    target_roles: input.roles,
    modality: input.modality,
    max_location: input.location,
    max_travel_minutes: 60,
    monthly_transport_budget_usd: 40,
    minimum_salary_usd: input.salary,
    availability: input.availability,
    contract_types: input.contracts,
    transport_modes: ['transit'],
    willing_to_train: input.train,
    willing_to_intern: input.intern,
  };
}

function chat(
  filled: Record<string, unknown>,
  transcript: SeedChatSession['transcript'],
  proposed: Record<string, unknown> = {},
): SeedChatSession {
  const slotState: SeedChatSession['slotState'] = {};
  for (const id of SLOT_IDS) {
    if (Object.prototype.hasOwnProperty.call(proposed, id)) slotState[id] = { state: 'proposed', value: proposed[id] };
    else if (Object.prototype.hasOwnProperty.call(filled, id)) slotState[id] = { state: 'filled', value: filled[id] };
    else slotState[id] = { state: 'missing' };
  }
  return { transcript, slotState, llmTurns: transcript.length, capNoticeSent: false };
}

function doneChat(name: string, zone: string, modality: string, schedule: unknown, salary: number, train: boolean): SeedChatSession {
  return chat(
    {
      greeting: name,
      cv_source: 'No tengo / prefiero contarte',
      experiences: 'Ya conté mi experiencia',
      experience_tasks: 'Atender clientes',
      experience_duration: 'Más de un año',
      experiences_more: 'No, sigamos',
      education: 'Secundaria / bachiller',
      target_roles: 'Atención al cliente',
      zone,
      modality,
      schedule,
      minimum_salary_usd: salary,
      willing_to_train: train,
    },
    [
      { role: 'assistant', content: '¡Hola! Soy WorkBridge. ¿Cómo te llamo?' },
      { role: 'user', content: name },
      { role: 'assistant', content: 'Listo. Ya tengo tu perfil y tus preferencias.' },
    ],
  );
}

function student(input: {
  n: string;
  name: string;
  email: string;
  flow: string;
  expect: string;
  profile?: CandidateProfile;
  preferences?: CandidatePreferences;
  searches?: SeedSavedSearch[];
  visitedAt?: string;
  chat?: SeedChatSession;
}): SeedStudent {
  return {
    flow: input.flow,
    expect: input.expect,
    account: {
      userId: `seed_student_${input.n}`,
      name: input.name,
      email: input.email,
      role: 'candidate',
      employerOrgId: null,
    },
    ...(input.profile ? { profile: input.profile } : {}),
    ...(input.preferences ? { preferences: input.preferences } : {}),
    ...(input.searches ? { searches: input.searches } : {}),
    ...(input.visitedAt ? { visitedAt: input.visitedAt } : {}),
    ...(input.chat ? { chat: input.chat } : {}),
  };
}

const id = (n: string) => `seed_student_${n}`;

const counter: ExperienceInput = {
  key: 'caja',
  type: 'informal_work',
  title: 'Caja en minisúper',
  organization: 'Minisúper Don Pedro',
  description: 'Cobré en caja, atendí clientes y conté el inventario al cierre.',
  started: '2024-02-01',
  ended: '2025-11-30',
  where: 'Ciudad de Panamá',
  relevance: 'relevant',
  reason: 'Atención al cliente y caja coinciden con el puesto objetivo.',
  skills: [
    { id: 'plp:customer-service', level: 2, term: 'atender clientes' },
    { id: 'plp:point-of-sale', level: 2, term: 'caja' },
    { id: 'plp:communication', level: 2, term: 'comunicación' },
  ],
};

const office: ExperienceInput = {
  key: 'oficina',
  type: 'internship',
  title: 'Apoyo administrativo',
  organization: 'Clínica Santa Fe',
  description: 'Organicé documentos, digité datos y armé hojas de Excel.',
  started: '2025-06-01',
  ended: '2025-12-15',
  where: 'Ciudad de Panamá',
  relevance: 'relevant',
  reason: 'Ofimática y digitación coinciden con asistencia administrativa.',
  skills: [
    { id: 'plp:office-suite', level: 2, term: 'ofimática' },
    { id: 'plp:excel', level: 2, term: 'excel' },
    { id: 'plp:data-entry', level: 2, term: 'digitación' },
    { id: 'plp:organization', level: 2, term: 'organización' },
  ],
};

const shop: ExperienceInput = {
  key: 'ferreteria',
  type: 'formal_employment',
  title: 'Vendedor de mostrador',
  organization: 'Ferretería El Tornillo',
  description: 'Vendí en mostrador, expliqué productos y llevé el inventario.',
  started: '2023-08-01',
  ongoing: true,
  where: 'Arraiján',
  relevance: 'relevant',
  reason: 'Ventas de mostrador y atención al público.',
  skills: [
    { id: 'plp:customer-service', level: 3, term: 'ventas' },
    { id: 'plp:inventory', level: 2, term: 'inventario' },
    { id: 'plp:communication', level: 2, term: 'explicar productos' },
  ],
};

const support: ExperienceInput = {
  key: 'soporte',
  type: 'informal_work',
  title: 'Reparación de computadoras',
  organization: 'Taller del barrio',
  description: 'Diagnosticé computadoras, reinstalé Windows y revisé redes wifi.',
  started: '2024-01-15',
  ongoing: true,
  where: 'San Miguelito',
  relevance: 'relevant',
  reason: 'Diagnóstico de hardware y soporte coinciden con soporte técnico.',
  skills: [
    { id: 'plp:hardware-troubleshooting', level: 2, term: 'reparar computadoras' },
    { id: 'plp:windows', level: 2, term: 'windows' },
    { id: 'plp:networking-basics', level: 2, term: 'wifi' },
    { id: 'plp:problem-solving', level: 2, term: 'resolver fallas' },
  ],
};

const familyShop: ExperienceInput = {
  key: 'familia',
  type: 'family_business',
  title: 'Ayuda en la tienda de la familia',
  organization: 'Tienda Ríos',
  description: 'Atendí el negocio familiar, cobré y publiqué productos en redes.',
  started: '2022-04-01',
  ongoing: true,
  where: 'Bethania',
  relevance: 'partially_relevant',
  reason: 'La experiencia es informal y de negocio familiar; hace falta confirmar duración y tareas.',
  skills: [
    { id: 'plp:customer-service', level: 2, term: 'atender la tienda' },
    { id: 'plp:point-of-sale', level: 1, term: 'cobrar' },
    { id: 'plp:social-media', level: 1, term: 'redes sociales' },
  ],
};

const volunteer: ExperienceInput = {
  key: 'voluntariado',
  type: 'volunteering',
  title: 'Voluntariado en feria escolar',
  organization: 'Colegio José Dolores Moscote',
  description: 'Organicé filas y orienté a familias durante la feria de empleo del colegio.',
  started: '2025-09-01',
  ended: '2025-09-03',
  where: 'Ciudad de Panamá',
  relevance: 'partially_relevant',
  reason: 'Hay trato con público, pero fue un evento corto.',
  skills: [{ id: 'plp:communication', level: 1, term: 'orientar familias' }],
};

const bachiller = (key = 'bachi'): EducationInput => ({
  key,
  institution: 'Colegio José Dolores Moscote',
  program: 'Bachiller en comercio',
  level: 'secondary',
  started: '2021-03-01',
  ended: '2025-12-15',
});

const tecnico = (program: string): EducationInput => ({
  key: 'tecnico',
  institution: 'ITSE',
  program,
  level: 'technical',
  started: '2025-01-15',
  ongoing: true,
});

function ready(
  n: string,
  name: string,
  email: string,
  flow: string,
  expect: string,
  profileInput: Parameters<typeof buildProfile>[1],
  prefInput: Parameters<typeof buildPreferences>[1],
  extra?: { searches?: boolean; visitedAt?: string; zone?: string; schedule?: unknown },
): SeedStudent {
  const userId = id(n);
  const profile = buildProfile(userId, profileInput);
  const preferences = buildPreferences(userId, prefInput);
  const searches = extra?.searches
    ? [
        {
          searchId: makeId('search', `${userId}:principal`),
          candidateId: preferences.candidate_id,
          label: 'Mi búsqueda principal',
          savedAt: '2026-10-15T18:00:00.000Z',
          preferences,
          seenJobIds: ['lnk-1001'],
        },
        {
          searchId: makeId('search', `${userId}:otra`),
          candidateId: preferences.candidate_id,
          label: 'Otra zona',
          savedAt: '2026-10-14T18:00:00.000Z',
          preferences,
          seenJobIds: ['lnk-1004'],
        },
      ]
    : undefined;
  return student({
    n,
    name,
    email,
    flow,
    expect,
    profile,
    preferences,
    ...(searches ? { searches } : {}),
    ...(extra?.visitedAt ? { visitedAt: extra.visitedAt } : {}),
    chat: doneChat(
      name.split(' ')[0] ?? name,
      extra?.zone ?? 'Panamá (ciudad)',
      prefInput.modality,
      extra?.schedule ?? SCHEDULE_DAY,
      prefInput.salary,
      prefInput.train,
    ),
  });
}

export const seedStudents: SeedStudent[] = [
  student({
    n: '01',
    name: 'Ana Morales',
    email: 'ana.morales@seed.workbridge.test',
    flow: 'j1_bienvenida',
    expect: 'Entra a /chat y solo está el saludo. No hay perfil ni preferencias.',
    chat: chat(
      { greeting: 'Ana' },
      [
        { role: 'assistant', content: '¡Hola! Soy WorkBridge. ¿Cómo te llamo?' },
        { role: 'user', content: 'Ana' },
        { role: 'assistant', content: 'Mucho gusto, Ana. ¿Tienes un CV o una hoja de vida?' },
      ],
    ),
  }),
  student({
    n: '02',
    name: 'Luis Chen',
    email: 'luis.chen@seed.workbridge.test',
    flow: 'j1_sin_cv',
    expect: 'El chat sigue en experiencias. Dijo que no tiene CV.',
    chat: chat(
      { greeting: 'Luis', cv_source: 'No tengo / prefiero contarte' },
      [
        { role: 'assistant', content: '¿Tienes un CV o una hoja de vida?' },
        { role: 'user', content: 'No tengo, prefiero contarte.' },
        { role: 'assistant', content: '¿Has trabajado o ayudado en algún lugar?' },
      ],
    ),
  }),
  student({
    n: '03',
    name: 'María González',
    email: 'maria.gonzalez@seed.workbridge.test',
    flow: 'j1_perfil_sin_preferencias',
    expect: 'Hay perfil de caja. Al entrar va a /vacantes, pero aún no hay preferencias: el chat está en la zona.',
    profile: buildProfile(id('03'), {
      roles: ['Atención al cliente'],
      experiences: [counter],
      education: [bachiller()],
    }),
    chat: chat(
      {
        greeting: 'María',
        cv_source: 'No tengo / prefiero contarte',
        experiences: 'Caja en el minisúper',
        experience_tasks: 'Caja / cobrar',
        experience_duration: 'Más de un año',
        experiences_more: 'No, sigamos',
        education: 'Secundaria / bachiller',
        target_roles: 'Atención al cliente',
      },
      [
        { role: 'user', content: 'Trabajé en la caja del minisúper de mi barrio.' },
        { role: 'assistant', content: 'Ya sé bastante de ti. ¿En qué zona te queda bien trabajar?' },
      ],
    ),
  }),
  student({
    n: '04',
    name: 'José Rivera',
    email: 'jose.rivera@seed.workbridge.test',
    flow: 'j1_preferencias_a_medias',
    expect: 'Perfil administrativo listo. El chat ya tiene zona y modalidad; falta el horario.',
    profile: buildProfile(id('04'), {
      roles: ['Asistente administrativo'],
      experiences: [office],
      education: [tecnico('Técnico en administración')],
      source: 'pdf',
    }),
    chat: chat(
      {
        greeting: 'José',
        cv_source: 'Sí, lo subo',
        experiences: 'Pasantía en la clínica',
        experience_tasks: 'Organizar documentos',
        experience_duration: '3 a 12 meses',
        experiences_more: 'No, sigamos',
        education: 'Técnico',
        target_roles: 'Administrativo',
        zone: 'Panamá (ciudad)',
        modality: 'hybrid',
      },
      [
        { role: 'user', content: 'Subí mi hoja de vida de la pasantía.' },
        { role: 'assistant', content: '¿Qué horario te funciona?' },
      ],
    ),
  }),
  ready(
    '05',
    'Camila Ortega',
    'camila.ortega@seed.workbridge.test',
    'j2_atencion_ciudad',
    'Presencial, tiempo completo, ciudad, mínimo USD 600. Debe ver vacantes como lnk-1001 y lnk-1004.',
    { roles: ['Atención al cliente'], experiences: [counter], education: [bachiller()] },
    { roles: ['Atención al cliente'], modality: 'onsite', location: CITY, salary: 600, availability: DAY, contracts: ['full_time'], train: true, intern: false },
  ),
  ready(
    '06',
    'Diego Sánchez',
    'diego.sanchez@seed.workbridge.test',
    'j2_fin_de_semana',
    'Medio tiempo de fin de semana y mínimo USD 500. Debe coincidir con la caja de lnk-1002.',
    {
      roles: ['Atención al cliente', 'Ventas'],
      experiences: [{ ...counter, key: 'finde', title: 'Caja de fines de semana', ongoing: true, ended: undefined }],
      education: [bachiller('bachi')],
    },
    { roles: ['Atención al cliente'], modality: 'onsite', location: CITY, salary: 500, availability: WEEKEND, contracts: ['part_time'], train: true, intern: false },
    { schedule: SCHEDULE_WEEKEND },
  ),
  ready(
    '07',
    'Valeria Pérez',
    'valeria.perez@seed.workbridge.test',
    'j2_remoto_administrativo',
    'Remoto, tiempo completo, mínimo USD 700. Debe coincidir con lnk-1003.',
    { roles: ['Asistente administrativo'], experiences: [office], education: [tecnico('Técnico en asistencia administrativa')] },
    { roles: ['Asistente administrativo'], modality: 'remote', location: CITY, salary: 700, availability: DAY, contracts: ['full_time'], train: true, intern: false },
    { zone: 'Panamá (ciudad)' },
  ),
  ready(
    '08',
    'Kevin Batista',
    'kevin.batista@seed.workbridge.test',
    'j2_arraijan_ventas',
    'Presencial en Arraiján, tiempo completo, mínimo USD 600. Debe coincidir con lnk-1006.',
    { roles: ['Ventas'], experiences: [shop], education: [bachiller()] },
    { roles: ['Ventas'], modality: 'onsite', location: ARRAIJAN, salary: 600, availability: DAY, contracts: ['full_time'], train: false, intern: false },
    { zone: 'Arraiján' },
  ),
  ready(
    '09',
    'Sofía Herrera',
    'sofia.herrera@seed.workbridge.test',
    'j2_pasantia',
    'Busca pasantía presencial en la ciudad, mínimo USD 400. Debe coincidir con lnk-1005.',
    {
      roles: ['Ventas'],
      experiences: [{ ...counter, key: 'pasantia', type: 'academic', title: 'Proyecto de ventas del colegio', organization: 'Colegio José Dolores Moscote' }],
      education: [{ ...bachiller(), ongoing: true, ended: undefined }],
    },
    { roles: ['Ventas'], modality: 'onsite', location: CITY, salary: 400, availability: DAY, contracts: ['internship'], train: true, intern: true },
  ),
  ready(
    '10',
    'Mateo Aguilar',
    'mateo.aguilar@seed.workbridge.test',
    'j2_soporte_san_miguelito',
    'Soporte técnico, vive en San Miguelito y acepta la ciudad, presencial, mínimo USD 600. El catálogo no tiene vacante de soporte: verá coincidencias de horario y zona.',
    { roles: ['Soporte técnico'], experiences: [support], education: [tecnico('Técnico en redes')] },
    { roles: ['Soporte técnico'], modality: 'onsite', location: MIGUELITO, salary: 600, availability: DAY, contracts: ['full_time'], train: true, intern: false },
    { zone: 'San Miguelito' },
  ),
  ready(
    '11',
    'Ricardo Mendoza',
    'ricardo.mendoza@seed.workbridge.test',
    'j3_salario_alto',
    'Misma zona y horario que Camila, pero mínimo USD 2500. La exploración debe quedar vacía por salario.',
    { roles: ['Atención al cliente'], experiences: [counter], education: [bachiller()] },
    { roles: ['Atención al cliente'], modality: 'onsite', location: CITY, salary: 2500, availability: DAY, contracts: ['full_time'], train: true, intern: false },
  ),
  ready(
    '12',
    'Paola Jiménez',
    'paola.jimenez@seed.workbridge.test',
    'j3_fuera_de_zona',
    'Pide La Chorrera, provincia Panamá Oeste. Las vacantes del catálogo están en provincia Panamá, así que no hay coincidencia por zona.',
    { roles: ['Atención al cliente'], experiences: [{ ...counter, where: 'La Chorrera' }], education: [bachiller()] },
    { roles: ['Atención al cliente'], modality: 'onsite', location: OESTE, salary: 600, availability: DAY, contracts: ['full_time'], train: true, intern: false },
    { zone: 'Panamá Oeste' },
  ),
  ready(
    '13',
    'Andrés Quintero',
    'andres.quintero@seed.workbridge.test',
    'j3_sin_opciones',
    'Híbrido y mínimo USD 1800. Falla modalidad y salario a la vez: vacío y ruta de cursos.',
    { roles: ['Soporte técnico'], experiences: [support], education: [tecnico('Técnico en soporte')] },
    { roles: ['Soporte técnico'], modality: 'hybrid', location: CITY, salary: 1800, availability: HALF, contracts: ['full_time'], train: false, intern: false },
    { schedule: SCHEDULE_HALF },
  ),
  ready(
    '14',
    'Elena Castillo',
    'elena.castillo@seed.workbridge.test',
    'j4_retorno',
    'Perfil y preferencias listos, dos búsquedas guardadas y una visita a vacantes. Sirve para volver y revisar.',
    { roles: ['Atención al cliente'], experiences: [counter], education: [bachiller()] },
    { roles: ['Atención al cliente'], modality: 'onsite', location: CITY, salary: 600, availability: DAY, contracts: ['full_time'], train: true, intern: false },
    { searches: true, visitedAt: '2026-10-16T20:00:00.000Z' },
  ),
  ready(
    '15',
    'Natalia Ríos',
    'natalia.rios@seed.workbridge.test',
    'j4_experiencia_informal',
    'Negocio familiar y voluntariado, con aviso de revisión. Preferencias de ciudad ya guardadas para editar en Mi perfil.',
    {
      roles: ['Atención al cliente'],
      experiences: [familyShop, volunteer],
      education: [bachiller()],
      warnings: ['Algunos datos de la tienda familiar hay que confirmarlos en Mi perfil.'],
    },
    { roles: ['Atención al cliente'], modality: 'onsite', location: CITY, salary: 550, availability: HALF, contracts: ['part_time', 'full_time'], train: true, intern: false },
    { schedule: SCHEDULE_HALF },
  ),
  student({
    n: '16',
    name: 'Gabriel Torres',
    email: 'gabriel.torres@seed.workbridge.test',
    flow: 'j6_pregunta_libre',
    expect: 'El chat contestó una pregunta de oficio y sigue pidiendo estudios. No hay perfil todavía.',
    chat: chat(
      {
        greeting: 'Gabriel',
        cv_source: 'No tengo / prefiero contarte',
        experiences: 'Reparé computadoras de vecinos',
        experience_tasks: 'Reparar computadoras o celulares',
        experience_duration: '3 a 12 meses',
        experiences_more: 'No, sigamos',
      },
      [
        { role: 'user', content: '¿Qué hace alguien de soporte técnico?' },
        {
          role: 'assistant',
          content: 'En general, alguien de soporte técnico ayuda a que computadoras y redes vuelvan a funcionar, y anota lo que arregló. ¿Qué has estudiado o estás estudiando?',
        },
      ],
    ),
  }),
  ready(
    '17',
    'Isabella Cruz',
    'isabella.cruz@seed.workbridge.test',
    'j5_borrar_datos',
    'Tiene perfil sin experiencia laboral y preferencias básicas. Úsala para probar eliminar los datos desde Mi perfil.',
    {
      roles: ['Atención al cliente'],
      experiences: [],
      education: [{ ...bachiller(), program: 'Bachiller en ciencias', ongoing: true, ended: undefined }],
    },
    { roles: ['Atención al cliente'], modality: 'onsite', location: CITY, salary: 400, availability: DAY, contracts: ['part_time', 'internship'], train: true, intern: true },
  ),
];

export const seedEmployers: SeedEmployer[] = (
  [
    ['01', 'Banco Delta', 'Rosa Méndez', 'rosa.mendez@seed.workbridge.test', 'j9_pendientes_atencion', 'Cola de atención al cliente en la ciudad. Revisar, aprobar entrevista o no avanzar.'],
    ['02', 'Supermercado Central', 'Carlos Vidal', 'carlos.vidal@seed.workbridge.test', 'j9_caja_fin_de_semana', 'Caja de medio tiempo y fines de semana. Probar filtro por título de vacante.'],
    ['03', 'Consultora Istmo', 'Laura Quiel', 'laura.quiel@seed.workbridge.test', 'j9_remoto_administrativo', 'Asistencia administrativa remota. Decidir una postulación ya enviada.'],
    ['04', 'Farmacias Del Istmo', 'Helena Ponce', 'helena.ponce@seed.workbridge.test', 'j9_farmacia_presencial', 'Auxiliar presencial de servicio al cliente.'],
    ['05', 'Grupo Mar', 'Andrés Cedeño', 'andres.cedeno@seed.workbridge.test', 'j9_pasantias', 'Pasantía de ventas. La evidencia debe ser la que la persona aprobó.'],
    ['06', 'Ferretería El Tornillo', 'Miriam Batista', 'miriam.batista@seed.workbridge.test', 'j9_arraijan', 'Ventas en Arraiján. Confirmar que no ve postulaciones de otra empresa.'],
    ['07', 'Cable Oeste', 'Pedro Samaniego', 'pedro.samaniego@seed.workbridge.test', 'j9_soporte_tecnico', 'Soporte técnico en La Chorrera. Cola propia, vacía hasta que haya envíos.'],
    ['08', 'Clínica San Miguel', 'Irene Vásquez', 'irene.vasquez@seed.workbridge.test', 'j9_clinica_administrativa', 'Apoyo administrativo en San Miguelito.'],
    ['09', 'Hotel Bahía', 'Sergio Alonso', 'sergio.alonso@seed.workbridge.test', 'j9_hoteleria', 'Recepción y atención en el Casco Antiguo.'],
    ['10', 'Logística Canal', 'Nadia Franco', 'nadia.franco@seed.workbridge.test', 'j9_logistica', 'Inventario y bodega en Balboa. Ordenar la lista de más reciente a más antigua.'],
    ['11', 'Academia Código', 'Iván Tejada', 'ivan.tejada@seed.workbridge.test', 'j9_cola_vacia', 'Empresa sin postulaciones: la bandeja debe verse vacía, no rota.'],
    ['12', 'Cooperativa Sol', 'Yolanda Marín', 'yolanda.marin@seed.workbridge.test', 'j9_medio_tiempo', 'Contratos de medio tiempo en Juan Díaz.'],
    ['13', 'Taller Bytes', 'Hugo Chen', 'hugo.chen@seed.workbridge.test', 'j9_taller_hibrido', 'Reparación de equipos, modalidad híbrida.'],
    ['14', 'Almacén Don Pedro', 'Pedro Ríos', 'pedro.rios@seed.workbridge.test', 'j9_comercio_familiar', 'Mostrador de fin de semana en un comercio de barrio.'],
    ['15', 'Fundación Puente', 'Lucía Ortega', 'lucia.ortega@seed.workbridge.test', 'j9_primera_experiencia', 'Pasantías y primera experiencia. Motivo obligatorio al no avanzar.'],
  ] as const
).map(([n, orgName, contact, email, flow, expect]) => ({
  flow,
  expect,
  organization: { id: `seed_org_${n}`, name: orgName },
  account: {
    userId: `seed_employer_${n}`,
    name: contact,
    email,
    role: 'employer' as const,
    employerOrgId: `seed_org_${n}`,
  },
}));

export const seedCounselors: SeedCounselor[] = [
  {
    flow: 'j8_cola_orientador',
    expect: 'Entra a /orientador. La cola sale del runtime, no de estas tablas.',
    account: {
      userId: 'seed_counselor_01',
      name: 'Irene Solís',
      email: 'irene.solis@seed.workbridge.test',
      role: 'counselor',
      employerOrgId: null,
    },
  },
  {
    flow: 'j8_segundo_orientador',
    expect: 'Segunda cuenta de orientación para probar dos sesiones distintas.',
    account: {
      userId: 'seed_counselor_02',
      name: 'Omar Delgado',
      email: 'omar.delgado@seed.workbridge.test',
      role: 'counselor',
      employerOrgId: null,
    },
  },
];

export const seedAccounts: SeedAccount[] = [
  ...seedStudents.map((item) => item.account),
  ...seedEmployers.map((item) => item.account),
  ...seedCounselors.map((item) => item.account),
];
