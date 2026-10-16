import type { SkillKind } from '../types';

/**
 * Curated seed taxonomy for the Panama Metro / Panama Oeste junior roles in
 * scope (technical support, customer service, administrative assistance).
 *
 * ESCO is the intended long-term reference; `esco_reference` records the
 * closest ESCO-style grouping as a note, not as a verified ESCO URI. A
 * versioned Panamanian synonym dictionary is folded into `synonyms` here so the
 * matcher stays deterministic and offline during the hackathon.
 */
export interface SkillDefinition {
  skill_id: string;
  canonical_name: string;
  kind: SkillKind;
  synonyms: string[];
  esco_reference?: string;
}

export const TAXONOMY_VERSION = '1.0.0';

export const SKILL_TAXONOMY: readonly SkillDefinition[] = [
  {
    skill_id: 'plp:excel',
    canonical_name: 'Excel',
    kind: 'technical',
    synonyms: ['excel', 'hoja de calculo', 'hojas de calculo', 'planillas', 'spreadsheet'],
    esco_reference: 'spreadsheet software',
  },
  {
    skill_id: 'plp:word',
    canonical_name: 'Word',
    kind: 'technical',
    synonyms: ['word', 'procesador de texto', 'word processor'],
    esco_reference: 'word processing software',
  },
  {
    skill_id: 'plp:office-suite',
    canonical_name: 'Ofimática',
    kind: 'technical',
    synonyms: ['ofimatica', 'office', 'microsoft office', 'paquete office', 'office 365', 'msoffice'],
    esco_reference: 'office suite software',
  },
  {
    skill_id: 'plp:data-entry',
    canonical_name: 'Digitación de datos',
    kind: 'technical',
    synonyms: ['digitacion', 'digitacion de datos', 'data entry', 'ingreso de datos', 'transcripcion de datos', 'tipeo'],
    esco_reference: 'data entry',
  },
  {
    skill_id: 'plp:point-of-sale',
    canonical_name: 'Punto de venta y caja',
    kind: 'technical',
    synonyms: ['caja', 'cajero', 'cajera', 'punto de venta', 'pos', 'cash register', 'manejo de caja', 'facturacion'],
    esco_reference: 'point of sale operation',
  },
  {
    skill_id: 'plp:inventory',
    canonical_name: 'Control de inventario',
    kind: 'technical',
    synonyms: ['inventario', 'control de inventario', 'inventory', 'stock', 'bodega'],
    esco_reference: 'inventory management',
  },
  {
    skill_id: 'plp:customer-support-tools',
    canonical_name: 'Herramientas de soporte (mesa de ayuda)',
    kind: 'technical',
    synonyms: ['mesa de ayuda', 'help desk', 'service desk', 'ticketing', 'zendesk', 'soporte tecnico', 'helpdesk'],
    esco_reference: 'help desk support',
  },
  {
    skill_id: 'plp:networking-basics',
    canonical_name: 'Redes básicas',
    kind: 'technical',
    synonyms: ['redes', 'red', 'networking', 'cableado estructurado', 'cableado de red', 'lan', 'wifi'],
    esco_reference: 'computer network configuration',
  },
  {
    skill_id: 'plp:hardware-troubleshooting',
    canonical_name: 'Diagnóstico de hardware',
    kind: 'technical',
    synonyms: ['hardware', 'mantenimiento de computadoras', 'mantenimiento de equipos', 'reparacion de pc', 'reparacion de computadoras', 'computadoras', 'computadora', 'pc', 'equipos de computo', 'diagnostico de equipos', 'troubleshooting'],
    esco_reference: 'hardware troubleshooting',
  },
  {
    skill_id: 'plp:windows',
    canonical_name: 'Windows',
    kind: 'technical',
    synonyms: ['windows', 'sistema operativo windows', 'windows 10', 'windows 11'],
    esco_reference: 'operating systems',
  },
  {
    skill_id: 'plp:sql',
    canonical_name: 'Bases de datos y SQL',
    kind: 'technical',
    synonyms: ['sql', 'base de datos', 'bases de datos', 'database', 'mysql', 'postgres', 'postgresql'],
    esco_reference: 'database management',
  },
  {
    skill_id: 'plp:python',
    canonical_name: 'Python',
    kind: 'technical',
    synonyms: ['python'],
    esco_reference: 'python programming',
  },
  {
    skill_id: 'plp:javascript',
    canonical_name: 'JavaScript',
    kind: 'technical',
    synonyms: ['javascript', 'js', 'typescript', 'node'],
    esco_reference: 'javascript programming',
  },
  {
    skill_id: 'plp:social-media',
    canonical_name: 'Gestión de redes sociales',
    kind: 'technical',
    synonyms: ['redes sociales', 'social media', 'community management', 'manejo de redes', 'instagram', 'facebook'],
    esco_reference: 'social media management',
  },
  {
    skill_id: 'plp:graphic-design',
    canonical_name: 'Diseño gráfico',
    kind: 'technical',
    synonyms: ['diseno grafico', 'diseño grafico', 'photoshop', 'illustrator', 'canva', 'figma', 'diseno'],
    esco_reference: 'graphic design',
  },
  {
    skill_id: 'plp:driving-license',
    canonical_name: 'Licencia de conducir',
    kind: 'technical',
    synonyms: ['licencia de conducir', 'licencia de manejo', 'licencia de automovil', 'driver license', 'licencia tipo'],
    esco_reference: 'driving licence',
  },
  {
    skill_id: 'plp:customer-service',
    canonical_name: 'Atención al cliente',
    kind: 'soft',
    synonyms: ['atencion al cliente', 'atención al cliente', 'atencion al publico', 'servicio al cliente', 'customer service', 'trato con clientes', 'orientacion al cliente'],
    esco_reference: 'customer service',
  },
  {
    skill_id: 'plp:communication',
    canonical_name: 'Comunicación',
    kind: 'soft',
    synonyms: ['comunicacion', 'comunicación', 'communication', 'comunicacion efectiva', 'expresion oral'],
    esco_reference: 'communication',
  },
  {
    skill_id: 'plp:teamwork',
    canonical_name: 'Trabajo en equipo',
    kind: 'soft',
    synonyms: ['trabajo en equipo', 'teamwork', 'colaboracion', 'colaboración', 'equipo de trabajo'],
    esco_reference: 'teamwork',
  },
  {
    skill_id: 'plp:problem-solving',
    canonical_name: 'Resolución de problemas',
    kind: 'soft',
    synonyms: ['resolucion de problemas', 'resolución de problemas', 'problem solving', 'solucion de problemas', 'pensamiento critico'],
    esco_reference: 'problem solving',
  },
  {
    skill_id: 'plp:responsibility',
    canonical_name: 'Responsabilidad',
    kind: 'soft',
    synonyms: ['responsabilidad', 'responsable', 'puntualidad', 'cumplimiento', 'compromiso'],
    esco_reference: 'reliability',
  },
  {
    skill_id: 'plp:adaptability',
    canonical_name: 'Adaptabilidad',
    kind: 'soft',
    synonyms: ['adaptabilidad', 'adaptable', 'flexibilidad', 'flexible'],
    esco_reference: 'adaptability',
  },
  {
    skill_id: 'plp:leadership',
    canonical_name: 'Liderazgo',
    kind: 'soft',
    synonyms: ['liderazgo', 'leadership', 'supervision de personal', 'supervisión', 'jefe de grupo'],
    esco_reference: 'leadership',
  },
  {
    skill_id: 'plp:organization',
    canonical_name: 'Organización',
    kind: 'soft',
    synonyms: ['organizacion', 'organización', 'planificacion', 'planificación', 'gestion del tiempo', 'organizado'],
    esco_reference: 'time management',
  },
  {
    skill_id: 'plp:attention-to-detail',
    canonical_name: 'Atención al detalle',
    kind: 'soft',
    synonyms: ['atencion al detalle', 'atención al detalle', 'detallista', 'minucioso', 'cuidadoso', 'attention to detail'],
    esco_reference: 'attention to detail',
  },
  {
    skill_id: 'plp:willingness-to-learn',
    canonical_name: 'Disposición para aprender',
    kind: 'soft',
    synonyms: ['disposicion para aprender', 'disposición para aprender', 'ganas de aprender', 'aprendizaje rapido', 'fast learner', 'proactivo'],
    esco_reference: 'willingness to learn',
  },
] as const;

export const TAXONOMY_BY_ID: ReadonlyMap<string, SkillDefinition> = new Map(
  SKILL_TAXONOMY.map((entry) => [entry.skill_id, entry]),
);

/** Lowercase, strip accents and punctuation, collapse whitespace/underscores. */
export function normalizeTerm(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

interface SynonymEntry {
  key: string;
  skill: SkillDefinition;
}

/** Synonym entries, longest key first so greedy matching prefers specific terms. */
const SYNONYM_ENTRIES: readonly SynonymEntry[] = (() => {
  const entries: SynonymEntry[] = [];
  const seen = new Set<string>();
  for (const entry of SKILL_TAXONOMY) {
    for (const term of [entry.canonical_name, ...entry.synonyms]) {
      const key = normalizeTerm(term);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      entries.push({ key, skill: entry });
    }
  }
  return entries.sort((a, b) => b.key.length - a.key.length || a.key.localeCompare(b.key));
})();

const SYNONYM_INDEX: ReadonlyMap<string, SkillDefinition> = new Map(
  SYNONYM_ENTRIES.map((entry) => [entry.key, entry.skill]),
);

export interface TermMatch {
  skill: SkillDefinition;
  matchedTerm: string;
}

/**
 * A synonym is only accepted as a substring match when it sits on word
 * boundaries, so `redaccion` never matches `red`.
 */
function findWholeWord(haystack: string, needle: string): number {
  let from = 0;
  for (;;) {
    const at = haystack.indexOf(needle, from);
    if (at === -1) return -1;
    const before = at === 0 ? ' ' : haystack[at - 1]!;
    const afterIndex = at + needle.length;
    const after = afterIndex >= haystack.length ? ' ' : haystack[afterIndex]!;
    if (before === ' ' && after === ' ') return at;
    from = at + 1;
  }
}

/** Resolve a single candidate term to a canonical taxonomy entry, if known. */
export function matchSkill(term: string): TermMatch | undefined {
  const key = normalizeTerm(term);
  if (!key) return undefined;
  const direct = SYNONYM_INDEX.get(key);
  if (direct) return { skill: direct, matchedTerm: key };

  const padded = ` ${key} `;
  for (const entry of SYNONYM_ENTRIES) {
    if (entry.key.length < 4) continue;
    if (findWholeWord(padded, entry.key) !== -1) {
      return { skill: entry.skill, matchedTerm: entry.key };
    }
  }
  return undefined;
}

/** Find every taxonomy term mentioned anywhere in a free-text blob. */
export function matchMentions(text: string): TermMatch[] {
  let haystack = ` ${normalizeTerm(text)} `;
  const seen = new Map<string, TermMatch>();
  for (const entry of SYNONYM_ENTRIES) {
    if (seen.has(entry.skill.skill_id)) continue;
    const at = findWholeWord(haystack, entry.key);
    if (at === -1) continue;
    seen.set(entry.skill.skill_id, { skill: entry.skill, matchedTerm: entry.key });
    // Mask the matched span so shorter overlapping synonyms cannot re-match it.
    haystack = haystack.slice(0, at) + ' '.repeat(entry.key.length) + haystack.slice(at + entry.key.length);
  }
  return [...seen.values()].sort((a, b) => a.skill.skill_id.localeCompare(b.skill.skill_id));
}
