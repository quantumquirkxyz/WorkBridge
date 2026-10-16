import type { ExperienceType } from '@puente/domain';
import { normalizeTerm } from '@puente/domain';

/** Terms that describe academic work rather than an academic credential. */
export const ACADEMIC_WORK_TERMS = ['tesis', 'trabajo academico'];

/** Venues that can indicate a family-run business, and whether they stand alone. */
const FAMILY_VENUES: ReadonlyArray<{ term: string; standalone: boolean }> = [
  { term: 'tienda', standalone: false },
  { term: 'fonda', standalone: true },
  { term: 'kiosco', standalone: true },
  { term: 'minisuper', standalone: true },
  { term: 'abarroteria', standalone: true },
  { term: 'negocio', standalone: false },
];

/** Relations that point at the candidate's own family. */
const FAMILY_RELATIONS = [
  'familia',
  'familiar',
  'mi mama',
  'mi papa',
  'mi madre',
  'mi padre',
  'mis padres',
  'mi hermana',
  'mi hermano',
  'mi tia',
  'mi tio',
];

/** Phrases that already imply a family business on their own. */
const FAMILY_BUSINESS_PHRASES = [
  'negocio familiar',
  'negocio de la familia',
  'tienda de mi familia',
  'tienda familiar',
  'puesto de la familia',
  'puesto de mi',
  'puesto familiar',
  'comercio familiar',
  'comercio de mi',
  'comercio de la familia',
  'local de mi',
  'local familiar',
];

const FAMILY_VENUE_TERMS = FAMILY_VENUES.map((venue) => venue.term);
const STANDALONE_FAMILY_VENUE_TERMS = FAMILY_VENUES.filter((venue) => venue.standalone).map((venue) => venue.term);

/** Ordered keyword rules for an experience entry. First match wins. */
const EXPERIENCE_TYPE_RULES: ReadonlyArray<{ type: ExperienceType; keywords: string[] }> = [
  { type: 'family_business', keywords: [...FAMILY_BUSINESS_PHRASES, ...STANDALONE_FAMILY_VENUE_TERMS] },
  { type: 'volunteering', keywords: ['voluntari', 'voluntario', 'voluntaria', 'trabajo comunitario', 'iglesia', 'grupo juvenil'] },
  { type: 'internship', keywords: ['pasantia', 'pasante', 'practica profesional', 'practicas profesionales', 'internship'] },
  { type: 'project', keywords: ['proyecto', 'proyectos', 'portafolio', 'hackathon', 'freelance', 'trabajo independiente'] },
  { type: 'academic', keywords: [...ACADEMIC_WORK_TERMS, 'universidad', 'colegio', 'escuela', 'bachiller'] },
  {
    type: 'formal_employment',
    keywords: ['empresa', 'contrato', 'planilla', 'empleo formal', 'cargo de', 'puesto de', 'trabaje en', 'trabajé en'],
  },
  { type: 'informal_work', keywords: ['trabaje', 'trabajé', 'trabajo informal', 'ayudaba', 'vendia', 'vendía', 'atendia', 'atendía', 'sin contrato', 'medio tiempo'] },
];

function isFamilyBusiness(haystack: string): boolean {
  const hasVenue = FAMILY_VENUE_TERMS.some((venue) => haystack.includes(venue));
  const hasRelation = FAMILY_RELATIONS.some((relation) => haystack.includes(relation));
  return hasVenue && hasRelation;
}

export function inferExperienceType(text: string): ExperienceType {
  const haystack = normalizeTerm(text);
  // Keyword combinations catch family work phrased in the candidate's own words
  // ("tienda de mi mamá"), not just the exact phrases in the rules below.
  if (isFamilyBusiness(haystack)) return 'family_business';
  for (const rule of EXPERIENCE_TYPE_RULES) {
    if (rule.keywords.some((keyword) => haystack.includes(normalizeTerm(keyword)))) return rule.type;
  }
  return 'informal_work';
}
