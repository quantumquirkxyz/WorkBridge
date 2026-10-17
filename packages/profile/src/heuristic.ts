import {
  matchMentions,
  normalizeTerm,
  type DraftCertification,
  type DraftEducation,
  type DraftExperience,
  type DraftSkill,
  type ExtractorKind,
  type Provenance,
  type ProfileDraft,
} from '@puente/domain';
import { ACADEMIC_WORK_TERMS, inferExperienceType } from './experience-type';

export interface ExtractionInput {
  text: string;
  sourceRef: string;
  provenance: Provenance;
  targetRoles?: string[];
  locale?: string;
}

export interface ProfileExtractor {
  /** The strategy this extractor is configured to run. */
  readonly kind: ExtractorKind;
  /** Extract a draft and report the strategy that actually produced it. */
  extract(input: ExtractionInput): Promise<ExtractionOutcome>;
}

/** A draft plus the strategy that actually produced it (reported per call). */
export interface ExtractionOutcome {
  draft: ProfileDraft;
  kind: ExtractorKind;
}

const EXPERIENCE_SIGNALS = [
  'experiencia',
  'trabaje',
  'trabajé',
  'labore',
  'laboré',
  'ayudaba',
  'ayudé',
  'voluntar',
  'pasantia',
  'pasantía',
  'pasante',
  'proyecto',
  'negocio',
  'tienda',
  'fonda',
  'atendi',
  'atendí',
  'vendi',
  'vendí',
  'cargo',
  'puesto',
  'empresa',
  'colabore',
  'colaboré',
  'realice',
  'realicé',
  'desarrolle',
  'desarrollé',
  'mantenimiento',
  'soporte',
  'servicio al cliente',
  ...ACADEMIC_WORK_TERMS,
];

const EDUCATION_SIGNALS = ['bachiller', 'licenciatura', 'universidad', 'colegio', 'instituto', 'escuela', 'tecnico', 'técnico', 'secundaria', 'primaria'];
const CERTIFICATION_SIGNALS = ['certificado', 'certificacion', 'certificación', 'curso', 'diplomado', 'acredita'];

const MAX_EXPERIENCES = 8;
const MAX_EDUCATION = 4;
const MAX_CERTIFICATIONS = 6;

export function splitStatements(text: string): string[] {
  return text
    .split(/\r?\n|(?<=[.;])\s+|[\u2022\u25CF]|\s+-\s+/u)
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
}

function containsAny(statement: string, signals: readonly string[]): boolean {
  const haystack = normalizeTerm(statement);
  return signals.some((signal) => haystack.includes(normalizeTerm(signal)));
}

function firstWords(value: string, count: number): string {
  const words = value.split(/\s+/).filter(Boolean);
  const title = words.slice(0, count).join(' ');
  return title.length > 120 ? `${title.slice(0, 117)}...` : title;
}

/** Build an experience draft anchored to one exact statement. */
function experienceFromStatement(statement: string, provenance: Provenance): DraftExperience {
  return {
    experience_type: inferExperienceType(statement),
    title: firstWords(statement, 8),
    description: statement,
    evidence: [{ claim: statement, source: provenance, excerpt: statement }],
  };
}

function educationLevelOf(statement: string): DraftEducation['level'] {
  const haystack = normalizeTerm(statement);
  if (haystack.includes('bachiller') || haystack.includes('secundaria')) return 'secondary';
  if (haystack.includes('licenciatura') || haystack.includes('universidad')) return 'undergraduate';
  if (haystack.includes('tecnico')) return 'technical';
  if (haystack.includes('curso')) return 'course';
  return 'other';
}

function extractInstitution(statement: string): string {
  const match = statement.match(/(universidad|colegio|instituto|escuela)\s+([\p{L}\p{N}\s.]+)/iu);
  const name = match?.[0]?.trim();
  return name && name.length > 3 ? name.slice(0, 200) : 'No especificada';
}

/**
 * Deterministic, offline extractor. It is the guaranteed fallback when no LLM is
 * available and the oracle used by unit tests. It never invents data: every
 * entry it emits is anchored to an exact statement from the intake text.
 */
export const heuristicProfileExtractor: ProfileExtractor = {
  kind: 'heuristic',
  async extract(input) {
    const statements = splitStatements(input.text);
    const levelHint = input.provenance === 'declared' ? 1 : 2;

    const experiences: DraftExperience[] = [];
    const education: DraftEducation[] = [];
    const certifications: DraftCertification[] = [];

    for (const statement of statements) {
      if (containsAny(statement, CERTIFICATION_SIGNALS)) {
        if (certifications.length < MAX_CERTIFICATIONS) {
          const issuer = statement.match(/(?:de|por)\s+([\p{L}\p{N}\s.]+)/iu)?.[1]?.trim();
          const certification: DraftCertification = {
            name: firstWords(statement, 12),
            evidence: [{ claim: statement, source: input.provenance, excerpt: statement }],
          };
          if (issuer && issuer.length > 2) certification.issuer = issuer.slice(0, 200);
          certifications.push(certification);
        }
        continue;
      }
      if (containsAny(statement, EDUCATION_SIGNALS) && education.length < MAX_EDUCATION) {
        education.push({
          institution: extractInstitution(statement),
          program: firstWords(statement, 12),
          level: educationLevelOf(statement),
          evidence: [{ claim: statement, source: input.provenance, excerpt: statement }],
        });
      }
      // A statement can be both academic and experiential ("trabajé en la
      // universidad…"), so experience detection runs independently of education.
      if (containsAny(statement, EXPERIENCE_SIGNALS) && experiences.length < MAX_EXPERIENCES) {
        experiences.push(experienceFromStatement(statement, input.provenance));
      }
    }

    const skills: DraftSkill[] = matchMentions(input.text).map((match) => ({
      original_term: match.matchedTerm,
      canonical_hint: match.skill.skill_id,
      kind_hint: match.skill.kind,
      level_hint: levelHint,
      evidence: [
        {
          claim: `Mentions ${match.matchedTerm}`,
          source: input.provenance,
          excerpt: match.matchedTerm,
        },
      ],
    }));

    const draft: ProfileDraft = { skills, experiences, education, certifications };
    if (input.targetRoles?.length) draft.target_roles = [...input.targetRoles];
    if (input.locale) draft.locale = input.locale;
    draft.notes = [
      'Extracted with the deterministic heuristic extractor; levels and relevance require confirmation.',
    ];
    if (experiences.length === MAX_EXPERIENCES) {
      draft.notes.push('Experience list was truncated to the first 8 entries.');
    }
    return { draft, kind: 'heuristic' };
  },
};
