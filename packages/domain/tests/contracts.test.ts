import { describe, expect, it } from 'vitest';
import {
  createAjv,
  SCHEMA_IDS,
  validateCandidateProfile,
  validateIntakeRequest,
  validateProfileDraft,
} from '../src/index';

function validSkill(overrides: Record<string, unknown> = {}) {
  return {
    skill_id: 'plp:excel',
    canonical_name: 'Excel',
    original_term: 'Excel',
    kind: 'technical',
    level: 2,
    evidence_ids: ['ev_1'],
    source: 'extracted',
    confidence: 0.8,
    ...overrides,
  };
}

function validProfile(overrides: Record<string, unknown> = {}) {
  return {
    schema_version: '1.0.0',
    candidate_id: 'candidate_1',
    locale: 'es-PA',
    created_at: '2026-10-16T00:00:00.000Z',
    updated_at: '2026-10-16T00:00:00.000Z',
    sources: [
      {
        kind: 'text',
        ref: 'candidate:statement',
        extraction_method: 'passthrough',
        extracted_at: '2026-10-16T00:00:00.000Z',
      },
    ],
    skills: [validSkill()],
    experiences: [],
    education: [],
    certifications: [],
    evidence: [
      {
        id: 'ev_1',
        claim: 'Used Excel for inventory',
        source: 'extracted',
        confidence: 0.8,
      },
    ],
    trace_id: 'trace_1',
    ...overrides,
  };
}

describe('JSON Schema 2020-12 contracts', () => {
  it('registers every versioned schema under its canonical $id', () => {
    const ajv = createAjv();
    for (const id of Object.values(SCHEMA_IDS)) {
      expect(ajv.getSchema(id), `missing schema ${id}`).toBeTruthy();
    }
  });

  it('accepts a well-formed CandidateProfile', () => {
    expect(validateCandidateProfile(validProfile())).toEqual({ valid: true });
  });

  it('rejects a declared-only skill above level 1 (acceptance criterion 5)', () => {
    const result = validateCandidateProfile(
      validProfile({ skills: [validSkill({ source: 'declared', level: 2 })] }),
    );
    expect(result.valid).toBe(false);
  });

  it('allows a declared skill at level 1', () => {
    const result = validateCandidateProfile(
      validProfile({
        skills: [validSkill({ source: 'declared', level: 1 })],
        evidence: [{ id: 'ev_1', claim: 'Says he knows Excel', source: 'declared', confidence: 0.5 }],
      }),
    );
    expect(result).toEqual({ valid: true });
  });

  it('rejects a skill above level 0 without evidence', () => {
    const result = validateCandidateProfile(
      validProfile({ skills: [validSkill({ level: 2, evidence_ids: [] })] }),
    );
    expect(result.valid).toBe(false);
  });

  it('rejects an unknown provenance value', () => {
    const result = validateCandidateProfile(validProfile({ skills: [validSkill({ source: 'guessed' })] }));
    expect(result.valid).toBe(false);
  });

  it('requires base64 content for PDF/image intake requests', () => {
    expect(validateIntakeRequest({ kind: 'pdf' }).valid).toBe(false);
    expect(validateIntakeRequest({ kind: 'pdf', contentBase64: 'AAAA' }).valid).toBe(true);
  });

  it('requires inline text for text/audio transcript intake requests', () => {
    expect(validateIntakeRequest({ kind: 'audio_transcript' }).valid).toBe(false);
    expect(validateIntakeRequest({ kind: 'audio_transcript', text: 'Trabajé en una tienda' }).valid).toBe(true);
  });

  it('accepts a minimal ProfileDraft', () => {
    expect(validateProfileDraft({ skills: [{ original_term: 'Excel' }] })).toEqual({ valid: true });
  });

  it('reports a readable error path on failure', () => {
    const result = validateCandidateProfile(validProfile({ skills: [validSkill({ level: 9 })] }));
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.join(' ')).toContain('candidateProfile');
    }
  });
});
