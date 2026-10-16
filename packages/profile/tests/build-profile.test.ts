import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { validateIntakeResult, type IntakeSource, type ProfileDraft } from '@puente/domain';
import { buildProfile, provenanceForIntakeKind, type ProfileExtractor } from '../src/index';

const fixture = readFileSync(fileURLToPath(new URL('./fixtures/cv-family-business.txt', import.meta.url)), 'utf8');
const fixedNow = () => new Date('2026-10-16T12:00:00.000Z');

function source(kind: IntakeSource['kind']): IntakeSource {
  return {
    kind,
    ref: `intake:cv.${kind}`,
    extraction_method: kind === 'pdf' ? 'unpdf' : 'passthrough',
    extracted_at: '2026-10-16T12:00:00.000Z',
  };
}

describe('provenanceForIntakeKind', () => {
  it('treats documents as extracted and pasted/transcribed text as declared', () => {
    expect(provenanceForIntakeKind('pdf')).toBe('extracted');
    expect(provenanceForIntakeKind('image')).toBe('extracted');
    expect(provenanceForIntakeKind('text')).toBe('declared');
    expect(provenanceForIntakeKind('audio_transcript')).toBe('declared');
  });
});

describe('buildProfile end to end', () => {
  it('extracts formal and informal experience, skills and education from a CV (declared text)', async () => {
    const result = await buildProfile(
      {
        text: fixture,
        source: source('text'),
        provenance: 'declared',
        traceId: 'trace_cv',
        targetRoles: ['Atención al cliente', 'Asistente administrativo'],
      },
      { now: fixedNow },
    );

    expect(validateIntakeResult(result)).toEqual({ valid: true });
    expect(result.profile.sources).toHaveLength(1);

    const types = result.profile.experiences.map((experience) => experience.experience_type);
    expect(types).toContain('family_business');
    expect(types).toContain('volunteering');

    // Declared-only text cannot justify a level above 1 (acceptance criterion 5).
    for (const skill of result.profile.skills) {
      expect(skill.level).toBeLessThanOrEqual(1);
    }

    const skillIds = result.profile.skills.map((skill) => skill.skill_id);
    expect(skillIds).toEqual(
      expect.arrayContaining(['plp:point-of-sale', 'plp:excel', 'plp:customer-service', 'plp:teamwork']),
    );
    expect(result.profile.education.length).toBeGreaterThanOrEqual(1);
    expect(result.profile.certifications.length).toBeGreaterThanOrEqual(1);
    expect(result.extraction.extractor).toBe('heuristic');
    expect(result.extraction.needs_review).toBe(true);
  });

  it('allows higher skill levels when the same CV arrives as a PDF (extracted)', async () => {
    const result = await buildProfile(
      {
        text: fixture,
        source: source('pdf'),
        provenance: 'extracted',
        traceId: 'trace_pdf',
        targetRoles: ['Asistente administrativo'],
      },
      { now: fixedNow },
    );
    expect(result.profile.skills.some((skill) => skill.level >= 2)).toBe(true);
    expect(result.profile.skills.every((skill) => skill.source === 'extracted')).toBe(true);
  });

  it('re-applies deterministic rules to a pluggable (LLM-shaped) extractor draft', async () => {
    const llmExtractor: ProfileExtractor = {
      kind: 'llm',
      async extract() {
        const draft: ProfileDraft = {
          skills: [
            {
              original_term: 'Atención al cliente',
              level_hint: 4,
              evidence: [{ claim: 'Excelente atención al cliente', source: 'declared' }],
            },
          ],
          experiences: [
            {
              experience_type: 'family_business',
              title: 'Tienda familiar',
              description: 'Atendía clientes en la tienda familiar y manejaba la caja cada fin de semana.',
              evidence: [{ claim: 'Atendía clientes', source: 'declared' }],
            },
          ],
        };
        return { draft, kind: 'llm' };
      },
    };

    const result = await buildProfile(
      { text: 'placeholder', source: source('text'), provenance: 'declared', traceId: 'trace_llm' },
      { extractor: llmExtractor, now: fixedNow },
    );
    expect(result.extraction.extractor).toBe('llm');
    // The LLM asked for level 4 but declared-only evidence caps it at 1.
    expect(result.profile.skills[0]?.level).toBe(1);
    expect(result.profile.experiences[0]?.experience_type).toBe('family_business');
  });

  it('is deterministic across runs', async () => {
    const args = {
      text: fixture,
      source: source('text'),
      provenance: 'declared' as const,
      traceId: 'trace_cv',
    };
    const a = await buildProfile(args, { now: fixedNow });
    const b = await buildProfile(args, { now: fixedNow });
    expect(JSON.stringify(a.profile)).toBe(JSON.stringify(b.profile));
  });

  it("extracts academic work and family work phrased in the candidate's own words", async () => {
    const text = [
      'Trabajé como asistente de laboratorio en la universidad.',
      'Ayudaba en la tienda de mi mamá los fines de semana.',
    ].join('\n');
    const result = await buildProfile(
      { text, source: source('text'), provenance: 'declared', traceId: 'trace_academic' },
      { now: fixedNow },
    );
    const types = result.profile.experiences.map((experience) => experience.experience_type);
    expect(types).toContain('academic');
    expect(types).toContain('family_business');
  });

  it('keeps formal employment distinct from family work and extracts academic artifacts', async () => {
    const text = [
      'Conseguí un puesto en la empresa para ayudar a mi familia.',
      'Tesis: predicción de demanda con modelos de series de tiempo.',
    ].join('\n');
    const result = await buildProfile(
      { text, source: source('text'), provenance: 'declared', traceId: 'trace_regressions' },
      { now: fixedNow },
    );
    const byDescription = (fragment: string) =>
      result.profile.experiences.find((experience) => experience.description.includes(fragment));
    expect(byDescription('puesto en la empresa')?.experience_type).toBe('formal_employment');
    expect(byDescription('Tesis')?.experience_type).toBe('academic');
  });

  it('recognises family work named by venue and relation (puesto / comercio)', async () => {
    const text = [
      'Ayudaba en el puesto de mi mamá los sábados.',
      'Atendía el comercio familiar en las tardes.',
    ].join('\n');
    const result = await buildProfile(
      { text, source: source('text'), provenance: 'declared', traceId: 'trace_family_phrases' },
      { now: fixedNow },
    );
    const familyWork = result.profile.experiences.filter(
      (experience) => experience.experience_type === 'family_business',
    );
    expect(familyWork).toHaveLength(2);
  });

  it('does not treat an unrelated possessive venue as family work', async () => {
    const text = [
      'Trabajé en el comercio de mi ciudad durante un año.',
      'Trabajé en el negocio de mi abuelo los fines de semana.',
      'Ayudaba en el puesto de mis padres durante las vacaciones.',
    ].join('\n');
    const result = await buildProfile(
      { text, source: source('text'), provenance: 'declared', traceId: 'trace_possessive' },
      { now: fixedNow },
    );
    const byDescription = (fragment: string) =>
      result.profile.experiences.find((experience) => experience.description.includes(fragment));
    expect(byDescription('comercio de mi ciudad')?.experience_type).not.toBe('family_business');
    expect(byDescription('negocio de mi abuelo')?.experience_type).toBe('family_business');
    expect(byDescription('puesto de mis padres')?.experience_type).toBe('family_business');
  });
});
