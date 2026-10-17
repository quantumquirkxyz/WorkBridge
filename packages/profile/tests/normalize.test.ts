import { describe, expect, it } from 'vitest';
import { validateCandidateProfile, type IntakeSource, type ProfileDraft } from '@puente/domain';
import { normalizeProfileDraft } from '../src/normalize';

const fixedNow = () => new Date('2026-10-16T12:00:00.000Z');

function source(kind: IntakeSource['kind']): IntakeSource {
  return {
    kind,
    ref: `intake:${kind}`,
    extraction_method: 'test',
    extracted_at: '2026-10-16T12:00:00.000Z',
  };
}

const baseDraft: ProfileDraft = {
  skills: [
    {
      original_term: 'Excel',
      canonical_hint: 'plp:excel',
      level_hint: 4,
      evidence: [{ claim: 'Excel avanzado', source: 'declared' }],
    },
  ],
  experiences: [],
  education: [],
  certifications: [],
};

describe('normalizeProfileDraft', () => {
  it('caps a declared-only skill at level 1 and records the reason', () => {
    const profile = normalizeProfileDraft(baseDraft, {
      traceId: 'trace_1',
      sources: [source('text')],
      provenance: 'declared',
      now: fixedNow,
    });
    const excel = profile.skills.find((skill) => skill.skill_id === 'plp:excel');
    expect(excel?.level).toBe(1);
    expect(excel?.source).toBe('declared');
    expect(excel?.normalization_notes?.join(' ')).toContain('level 1');
  });

  it('allows levels above 1 when extracted evidence exists', () => {
    const profile = normalizeProfileDraft(
      {
        skills: [
          {
            original_term: 'Excel',
            level_hint: 3,
            evidence: [{ claim: 'Excel avanzado', source: 'extracted' }],
          },
        ],
      },
      { traceId: 'trace_1', sources: [source('pdf')], provenance: 'extracted', now: fixedNow },
    );
    expect(profile.skills[0]?.level).toBe(3);
    expect(profile.skills[0]?.source).toBe('extracted');
  });

  it('still caps at 1 when the only evidence is declared, even for a PDF', () => {
    const profile = normalizeProfileDraft(
      {
        skills: [
          {
            original_term: 'Excel',
            level_hint: 3,
            evidence: [{ claim: 'Says Excel', source: 'declared' }],
          },
        ],
      },
      { traceId: 'trace_1', sources: [source('pdf')], provenance: 'extracted', now: fixedNow },
    );
    expect(profile.skills[0]?.level).toBe(1);
  });

  it('caps a declared intake even when the draft labels its evidence extracted', () => {
    const profile = normalizeProfileDraft(
      {
        skills: [
          {
            original_term: 'Excel',
            canonical_hint: 'plp:excel',
            level_hint: 3,
            evidence: [{ claim: 'Excel avanzado', source: 'extracted' }],
          },
        ],
      },
      { traceId: 'trace_1', sources: [source('text')], provenance: 'declared', now: fixedNow },
    );
    const excel = profile.skills.find((skill) => skill.skill_id === 'plp:excel');
    expect(excel?.level).toBe(1);
    // The evidence source is clamped to the intake provenance, not the draft's claim.
    expect(excel?.source).toBe('declared');
  });

  it('merges duplicate skills and keeps the highest level and all evidence', () => {
    const profile = normalizeProfileDraft(
      {
        skills: [
          { original_term: 'Excel', level_hint: 1, evidence: [{ claim: 'a', source: 'extracted' }] },
          { original_term: 'hoja de cálculo', level_hint: 2, evidence: [{ claim: 'b', source: 'extracted' }] },
        ],
      },
      { traceId: 'trace_1', sources: [source('pdf')], provenance: 'extracted', now: fixedNow },
    );
    const excelSkills = profile.skills.filter((skill) => skill.skill_id === 'plp:excel');
    expect(excelSkills).toHaveLength(1);
    expect(excelSkills[0]?.level).toBe(2);
    expect(excelSkills[0]?.evidence_ids.length).toBeGreaterThanOrEqual(2);
  });

  it('keeps unknown terms unmapped and capped at level 1', () => {
    const profile = normalizeProfileDraft(
      {
        skills: [{ original_term: 'Manejo de drones', level_hint: 3, evidence: [{ claim: 'x', source: 'extracted' }] }],
      },
      { traceId: 'trace_1', sources: [source('pdf')], provenance: 'extracted', now: fixedNow },
    );
    expect(profile.skills[0]?.skill_id).toMatch(/^plp:unmapped:/);
    expect(profile.skills[0]?.level).toBe(1);
    expect(profile.skills[0]?.normalization_notes?.join(' ')).toContain('taxonomy');
  });

  it('always produces an Ajv-valid CandidateProfile with deterministic ids', () => {
    const options = { traceId: 'trace_1', sources: [source('text')], provenance: 'declared' as const, now: fixedNow };
    const first = normalizeProfileDraft(baseDraft, options);
    const second = normalizeProfileDraft(baseDraft, options);
    expect(validateCandidateProfile(first)).toEqual({ valid: true });
    expect(first.evidence.map((e) => e.id)).toEqual(second.evidence.map((e) => e.id));
    expect(first.skills.map((s) => s.skill_id)).toEqual(second.skills.map((s) => s.skill_id));
  });

  it('derives target roles and classifies experiences against them', () => {
    const profile = normalizeProfileDraft(
      {
        target_roles: ['Soporte técnico'],
        experiences: [
          {
            experience_type: 'formal_employment',
            title: 'Soporte técnico',
            description: 'Reparé computadoras, configuré la red y atendí usuarios durante un año completo.',
            evidence: [{ claim: 'Reparé computadoras', source: 'extracted' }],
          },
        ],
      },
      { traceId: 'trace_1', sources: [source('pdf')], provenance: 'extracted', now: fixedNow },
    );
    expect(profile.experiences[0]?.relevance).toBe('relevant');
    expect(profile.experiences[0]?.skill_ids).toEqual(
      expect.arrayContaining(['plp:hardware-troubleshooting', 'plp:networking-basics']),
    );
  });

  it('propagates warnings into the profile', () => {
    const profile = normalizeProfileDraft(baseDraft, {
      traceId: 'trace_1',
      sources: [source('text')],
      provenance: 'declared',
      warnings: ['low OCR confidence'],
      now: fixedNow,
    });
    expect(profile.warnings).toContain('low OCR confidence');
  });
});
