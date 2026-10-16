import type { ExperienceType } from '@puente/domain';
import { normalizeTerm } from '@puente/domain';

/** Terms that describe academic work rather than an academic credential. */
export const ACADEMIC_WORK_TERMS = ['tesis', 'trabajo academico'];

/** Venues that can indicate a family-run business, and whether the bare word is enough. */
const FAMILY_VENUES: ReadonlyArray<{ term: string; standalone: boolean }> = [
  { term: 'tienda', standalone: false },
  { term: 'fonda', standalone: true },
  { term: 'kiosco', standalone: true },
  { term: 'minisuper', standalone: true },
  { term: 'abarroteria', standalone: true },
  { term: 'negocio', standalone: false },
];

/**
 * Venues that are ambiguous with formal work ("un puesto en la empresa"), so
 * they only count as family work when a possessive family phrase follows.
 */
const POSSESSIVE_FAMILY_VENUES = ['puesto', 'comercio', 'local'];

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
  'abuelo',
  'abuela',
];

/** Family nouns that may follow a possessive ("de mi mamá", "de la familia"). */
const FAMILY_NOUNS = [
  'familia',
  'mama',
  'papa',
  'madre',
  'padre',
  'hermana',
  'hermano',
  'tia',
  'tio',
  'abuelo',
  'abuela',
  'hijo',
  'hija',
];

/** Adjective phrases that already imply a family business on their own. */
const FAMILY_BUSINESS_PHRASES = [
  'negocio familiar',
  'tienda familiar',
  'puesto familiar',
  'comercio familiar',
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

function hasPossessiveFamilyVenue(haystack: string): boolean {
  return POSSESSIVE_FAMILY_VENUES.some((venue) =>
    FAMILY_NOUNS.some(
      (noun) => haystack.includes(`${venue} de mi ${noun}`) || haystack.includes(`${venue} de la ${noun}`),
    ),
  );
}

function isFamilyBusiness(haystack: string): boolean {
  const hasVenue = FAMILY_VENUE_TERMS.some((venue) => haystack.includes(venue));
  const hasRelation = FAMILY_RELATIONS.some((relation) => haystack.includes(relation));
  return (hasVenue && hasRelation) || hasPossessiveFamilyVenue(haystack);
}

export function inferExperienceType(text: string): ExperienceType {
  const haystack = normalizeTerm(text);
  // Keyword combinations catch family work phrased in the candidate's own words
  // ("tienda de mi mamá", "puesto de mi papá"), not just the exact phrases below.
  if (isFamilyBusiness(haystack)) return 'family_business';
  for (const rule of EXPERIENCE_TYPE_RULES) {
    if (rule.keywords.some((keyword) => haystack.includes(normalizeTerm(keyword)))) return rule.type;
  }
  return 'informal_work';
}
