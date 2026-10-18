import { matchMentions, normalizeTerm, validateProfileDraft, type DraftSkill, type ProfileDraft } from '@workbridge/domain';
import type { ExtractionInput, ExtractionOutcome, ProfileExtractor } from '@workbridge/profile';
import type { ChatFn } from '../llm/openrouter';
import { redactPii } from '../pii';

/** Self-contained structured-output schema (no cross-file `$ref`s). */
export const LLM_DRAFT_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  properties: {
    locale: { type: 'string' },
    target_roles: { type: 'array', items: { type: 'string' } },
    skills: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['original_term'],
        properties: {
          original_term: { type: 'string' },
          canonical_hint: { type: 'string' },
          kind_hint: { enum: ['technical', 'soft'] },
          level_hint: { type: 'integer', minimum: 0, maximum: 4 },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          evidence: { type: 'array', items: { $ref: '#/$defs/evidence' } },
        },
      },
    },
    experiences: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['experience_type', 'title', 'description'],
        properties: {
          experience_type: {
            enum: ['formal_employment', 'informal_work', 'family_business', 'volunteering', 'project', 'academic', 'internship'],
          },
          title: { type: 'string' },
          organization: { type: 'string' },
          description: { type: 'string' },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          evidence: { type: 'array', items: { $ref: '#/$defs/evidence' } },
        },
      },
    },
    education: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['institution', 'program'],
        properties: {
          institution: { type: 'string' },
          program: { type: 'string' },
          level: { enum: ['primary', 'secondary', 'technical', 'undergraduate', 'postgraduate', 'course', 'other'] },
          evidence: { type: 'array', items: { $ref: '#/$defs/evidence' } },
        },
      },
    },
    certifications: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name'],
        properties: {
          name: { type: 'string' },
          issuer: { type: 'string' },
          evidence: { type: 'array', items: { $ref: '#/$defs/evidence' } },
        },
      },
    },
    notes: { type: 'array', items: { type: 'string' } },
  },
  $defs: {
    evidence: {
      type: 'object',
      additionalProperties: false,
      required: ['claim', 'source'],
      properties: {
        claim: { type: 'string' },
        source: { enum: ['declared', 'extracted', 'verified', 'inferred'] },
        source_ref: { type: 'string' },
        excerpt: { type: 'string' },
        confidence: { type: 'number', minimum: 0, maximum: 1 },
      },
    },
  },
};

export const DEFAULT_SYSTEM_PROMPT = [
  'Eres el Agente de Perfil y Evidencia de WorkBridge.',
  'Extraes experiencia formal e informal, proyectos, negocio familiar, voluntariado y trabajo académico,',
  'además de habilidades técnicas y blandas, desde el texto de un CV o una descripción.',
  'Reglas estrictas:',
  '- Conserva siempre el término original del candidato en `original_term`.',
  '- Incluye cada habilidad escrita en el CV, también las blandas de secciones como Habilidades o Competencias:',
  '  trabajo en equipo, comunicación, liderazgo, puntualidad, organización, resolución de problemas,',
  '  atención al detalle, trabajo bajo presión, manejo del tiempo y adaptabilidad.',
  '- Una habilidad solo declarada no puede superar level 1; usa level 2+ únicamente cuando exista evidencia extraída del documento.',
  '- No inventes datos, empresas, fechas, cargos ni certificaciones. Si no está escrito, no lo incluyas.',
  '- `excerpt` debe ser un fragmento literal del texto, no una paráfrasis.',
  '- Cada entrada debe incluir al menos una evidencia con su `source` (declared, extracted, verified o inferred).',
  '- Responde únicamente con JSON válido que cumpla el esquema indicado.',
].join('\n');

export interface LlmExtractorOptions {
  chat: ChatFn;
  systemPrompt?: string;
  model?: string;
  redact?: boolean;
  maxTextChars?: number;
}

/**
 * LLM-backed extractor. It is intentionally thin: it only turns text into a
 * `ProfileDraft`. All level caps, relevance and provenance rules are re-applied
 * by `normalizeProfileDraft`, so a malformed or over-eager LLM answer can never
 * produce an invalid profile. Wrap it with `createResilientExtractor` so a
 * provider failure degrades to the heuristic extractor.
 */
export function createLlmProfileExtractor(options: LlmExtractorOptions): ProfileExtractor {
  const systemPrompt = options.systemPrompt ?? DEFAULT_SYSTEM_PROMPT;
  const maxTextChars = options.maxTextChars ?? 12000;
  const shouldRedact = options.redact ?? true;

  return {
    kind: 'llm',
    async extract(input: ExtractionInput): Promise<ExtractionOutcome> {
      const redaction = shouldRedact ? redactPii(input.text) : { text: input.text, replacements: 0, kinds: [] };
      const clipped = redaction.text.slice(0, maxTextChars);

      const hint = [
        `Provenance of the source text: ${input.provenance}.`,
        input.targetRoles?.length ? `Target roles: ${input.targetRoles.join(', ')}.` : '',
        input.locale ? `Locale: ${input.locale}.` : '',
      ]
        .filter(Boolean)
        .join('\n');

      const result = await options.chat({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `${hint}\n\nTexto del candidato:\n${clipped}` },
        ],
        jsonSchema: { name: 'profile_draft', schema: LLM_DRAFT_SCHEMA, strict: false },
        temperature: 0,
      });

      let parsed: unknown;
      try {
        parsed = JSON.parse(result.content);
      } catch {
        throw new Error('LLM returned content that is not valid JSON');
      }

      const validation = validateProfileDraft(parsed);
      if (!validation.valid) {
        throw new Error(`LLM draft failed contract validation: ${validation.errors.join('; ')}`);
      }
      return { draft: groundDraft(parsed as ProfileDraft, clipped, input.provenance), kind: 'llm' };
    },
  };
}

function mentioned(source: string, fragment: string | undefined): boolean {
  const needle = normalizeTerm(fragment ?? '');
  if (needle.length < 3) return false;
  return normalizeTerm(source).includes(needle);
}

function recoverPhrase(source: string, key: string): string {
  const words = key.split(' ').filter(Boolean);
  if (words.length === 0) return key;
  const pattern = words.map((word) => word.split('').map(accentClass).join('')).join('\\s+');
  const match = source.match(new RegExp(`(?:^|\\s)(${pattern})(?=\\s|$|[,.;])`, 'iu'));
  return match?.[1]?.trim() || key;
}

function accentClass(letter: string): string {
  const accents: Record<string, string> = { a: 'aáàä', e: 'eéèë', i: 'iíìï', o: 'oóòö', u: 'uúùü', n: 'nñ' };
  const set = accents[letter];
  return set ? `[${set}]` : letter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Drop claims the source text does not contain, and keep every taxonomy skill it does name. */
function groundDraft(draft: ProfileDraft, source: string, provenance: ExtractionInput['provenance']): ProfileDraft {
  const groundedSkills = (draft.skills ?? []).filter((skill) => mentioned(source, skill.original_term));
  const present = new Set(groundedSkills.map((skill) => normalizeTerm(skill.original_term)));
  const skills: DraftSkill[] = [...groundedSkills];
  for (const match of matchMentions(source)) {
    const phrase = recoverPhrase(source, match.matchedTerm);
    const key = normalizeTerm(phrase);
    if ([...present].some((term) => term === key || term.includes(match.matchedTerm) || match.matchedTerm.includes(term))) continue;
    skills.push({
      original_term: phrase,
      canonical_hint: match.skill.skill_id,
      kind_hint: match.skill.kind,
      level_hint: provenance === 'declared' ? 1 : 2,
      evidence: [{ claim: phrase, source: provenance, excerpt: phrase }],
    });
    present.add(key);
  }

  const experiences = (draft.experiences ?? []).filter((item) => mentioned(source, item.title) || mentioned(source, item.organization));
  const education = (draft.education ?? []).filter((item) => mentioned(source, item.program) || mentioned(source, item.institution));
  const certifications = (draft.certifications ?? []).filter((item) => mentioned(source, item.name));
  const dropped =
    (draft.skills?.length ?? 0) - groundedSkills.length +
    (draft.experiences?.length ?? 0) - experiences.length +
    (draft.education?.length ?? 0) - education.length +
    (draft.certifications?.length ?? 0) - certifications.length;
  const notes = [...(draft.notes ?? [])];
  if (dropped > 0) notes.push('Se descartaron datos que no aparecen escritos en el CV.');

  return { ...draft, skills, experiences, education, certifications, ...(notes.length ? { notes } : {}) };
}
