import { validateProfileDraft, type ProfileDraft } from '@puente/domain';
import type { ExtractionInput, ExtractionOutcome, ProfileExtractor } from '@puente/profile';
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
  'Eres el Agente de Perfil y Evidencia de Puente Laboral Panamá.',
  'Extraes experiencia formal e informal, proyectos, negocio familiar, voluntariado y trabajo académico,',
  'además de habilidades técnicas y blandas, desde el texto de un CV o una descripción.',
  'Reglas estrictas:',
  '- Conserva siempre el término original del candidato en `original_term`.',
  '- Una habilidad solo declarada no puede superar level 1; usa level 2+ únicamente cuando exista evidencia extraída del documento.',
  '- No inventes datos, empresas, fechas ni certificaciones.',
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
      return { draft: parsed as ProfileDraft, kind: 'llm' };
    },
  };
}
