import type { ExperienceType } from '@puente/domain';
import { normalizeTerm } from '@puente/domain';

/** Family-business signal data, kept in one place so it cannot drift. */
const FAMILY_BUSINESS = {
  /** Venues that, paired with a family relation, indicate a family-run business. */
  venues: ['tienda', 'fonda', 'kiosco', 'minisuper', 'abarroteria', 'negocio'],
  /** Venues strong enough to imply a family business without a stated relation. */
  standaloneVenues: ['fonda', 'kiosco', 'minisuper', 'abarroteria'],
  /** Relations that point at the candidate's own family. */
  relations: [
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
  ],
  /** Phrases that already imply a family business on their own. */
  phrases: [
    'negocio familiar',
    'negocio de la familia',
    'tienda de mi familia',
    'tienda familiar',
    'puesto de la familia',
  ],
} as const;

/** Ordered keyword rules for an experience entry. First match wins. */
const EXPERIENCE_TYPE_RULES: ReadonlyArray<{ type: ExperienceType; keywords: string[] }> = [
  { type: 'family_business', keywords: [...FAMILY_BUSINESS.phrases, ...FAMILY_BUSINESS.standaloneVenues] },
  { type: 'volunteering', keywords: ['voluntari', 'voluntario', 'voluntaria', 'trabajo comunitario', 'iglesia', 'grupo juvenil'] },
  { type: 'internship', keywords: ['pasantia', 'pasante', 'practica profesional', 'practicas profesionales', 'internship'] },
  { type: 'project', keywords: ['proyecto', 'proyectos', 'portafolio', 'hackathon', 'freelance', 'trabajo independiente'] },
  { type: 'academic', keywords: ['universidad', 'colegio', 'escuela', 'trabajo academico', 'tesis', 'bachiller'] },
  {
    type: 'formal_employment',
    keywords: ['empresa', 'contrato', 'planilla', 'empleo formal', 'cargo de', 'puesto de', 'trabaje en', 'trabajé en'],
  },
  { type: 'informal_work', keywords: ['trabaje', 'trabajé', 'trabajo informal', 'ayudaba', 'vendia', 'vendía', 'atendia', 'atendía', 'sin contrato', 'medio tiempo'] },
];

function isFamilyBusiness(haystack: string): boolean {
  const hasVenue = FAMILY_BUSINESS.venues.some((venue) => haystack.includes(venue));
  const hasRelation = FAMILY_BUSINESS.relations.some((relation) => haystack.includes(relation));
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
