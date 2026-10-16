import type { ExperienceType } from '@puente/domain';
import { normalizeTerm } from '@puente/domain';

/** Ordered keyword rules for an experience entry. First match wins. */
const EXPERIENCE_TYPE_RULES: ReadonlyArray<{ type: ExperienceType; keywords: string[] }> = [
  {
    type: 'family_business',
    keywords: ['negocio familiar', 'negocio de la familia', 'tienda de mi familia', 'tienda familiar', 'fonda', 'kiosco', 'minisuper', 'abarroteria', 'puesto de la familia'],
  },
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

export function inferExperienceType(text: string): ExperienceType {
  const haystack = normalizeTerm(text);
  for (const rule of EXPERIENCE_TYPE_RULES) {
    if (rule.keywords.some((keyword) => haystack.includes(normalizeTerm(keyword)))) return rule.type;
  }
  return 'informal_work';
}
