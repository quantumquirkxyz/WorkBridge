import { describe, expect, it } from 'vitest';
import {
  validateCandidateProfile,
  type CandidateCertification,
  type CandidateEducation,
  type CandidateExperience,
  type CandidateProfile,
  type CandidateSkill,
  type Evidence,
  type IntakeSource,
} from '@puente/domain';
import { mergeCandidateProfiles, profileNeedsReview } from '../src/index';

function evidence(id: string, claim: string): Evidence {
  return { id, claim, source: 'extracted', confidence: 0.8 };
}

function source(kind: IntakeSource['kind'], ref: string): IntakeSource {
  return {
    kind,
    ref,
    extraction_method: kind === 'pdf' ? 'unpdf' : 'passthrough',
    extracted_at: '2026-01-01T00:00:00.000Z',
  };
}

function skill(overrides: Partial<CandidateSkill> & Pick<CandidateSkill, 'skill_id' | 'level' | 'evidence_ids'>): CandidateSkill {
  return {
    canonical_name: 'Excel',
    original_term: 'Excel',
    kind: 'technical',
    source: overrides.level > 1 ? 'extracted' : 'declared',
    confidence: 0.6,
    ...overrides,
  };
}

function experience(
  overrides: Partial<CandidateExperience> & Pick<CandidateExperience, 'id' | 'title' | 'evidence_ids'>,
): CandidateExperience {
  return {
    experience_type: 'family_business',
    description: 'Atendía la caja',
    source: 'declared',
    relevance: 'partially_relevant',
    relevance_reason: 'Coincide con atención al cliente',
    skill_ids: ['plp:excel'],
    confidence: 0.4,
    ...overrides,
  };
}

function education(
  overrides: Partial<CandidateEducation> & Pick<CandidateEducation, 'id' | 'evidence_ids'>,
): CandidateEducation {
  return {
    institution: 'Instituto Nacional',
    program: 'Bachiller en comercio',
    level: 'secondary',
    source: 'declared',
    confidence: 0.5,
    ...overrides,
  };
}

function certification(
  overrides: Partial<CandidateCertification> & Pick<CandidateCertification, 'id' | 'name' | 'evidence_ids'>,
): CandidateCertification {
  return {
    status: 'declared',
    source: 'declared',
    confidence: 0.5,
    ...overrides,
  };
}

function profile(overrides: Partial<CandidateProfile>): CandidateProfile {
  return {
    schema_version: '1.0.0',
    candidate_id: 'candidate_1',
    locale: 'es-PA',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    sources: [source('text', 'intake:chat')],
    skills: [],
    experiences: [],
    education: [],
    certifications: [],
    evidence: [],
    trace_id: 'trace_existing',
    ...overrides,
  };
}

describe('mergeCandidateProfiles', () => {
  const existing = profile({
    target_roles: ['Cajero'],
    warnings: ['Revisar fechas'],
    skills: [
      skill({
        skill_id: 'plp:excel',
        canonical_name: 'Excel',
        original_term: 'Excel',
        level: 1,
        source: 'declared',
        confidence: 0.4,
        evidence_ids: ['ev_excel_chat'],
      }),
      skill({
        skill_id: 'plp:customer-service',
        canonical_name: 'Atención al cliente',
        original_term: 'atención al cliente',
        kind: 'soft',
        level: 1,
        source: 'declared',
        confidence: 0.5,
        evidence_ids: ['ev_service'],
      }),
    ],
    experiences: [
      experience({
        id: 'exp_tienda',
        title: 'Ayudante de tienda',
        organization: 'Tienda familiar',
        description: 'Caja',
        evidence_ids: ['ev_tienda'],
        confidence: 0.4,
        relevance: 'not_relevant',
        relevance_reason: 'Falta detalle',
      }),
      experience({
        id: 'exp_voluntariado',
        title: 'Voluntariado escolar',
        organization: 'Colegio',
        experience_type: 'volunteering',
        description: 'Apoyé eventos del colegio',
        evidence_ids: ['ev_voluntariado'],
        skill_ids: [],
      }),
    ],
    education: [
      education({ id: 'edu_bachiller', evidence_ids: ['ev_edu'] }),
      education({
        id: 'edu_curso',
        program: 'Computación',
        institution: 'INA',
        level: 'course',
        evidence_ids: ['ev_curso'],
      }),
    ],
    certifications: [
      certification({
        id: 'cert_excel',
        name: 'Excel básico',
        issuer: 'INA',
        evidence_ids: ['ev_cert'],
      }),
    ],
    evidence: [
      evidence('ev_excel_chat', 'Mencionó Excel'),
      evidence('ev_service', 'Atendía clientes'),
      evidence('ev_tienda', 'Trabajó en la tienda'),
      evidence('ev_voluntariado', 'Voluntariado'),
      evidence('ev_edu', 'Bachiller'),
      evidence('ev_curso', 'Curso de computación'),
      evidence('ev_cert', 'Certificado de Excel'),
    ],
  });

  const incoming = profile({
    created_at: '2026-02-01T00:00:00.000Z',
    updated_at: '2026-02-01T00:00:00.000Z',
    trace_id: 'trace_incoming',
    target_roles: ['Cajero', 'Auxiliar administrativo'],
    warnings: ['Revisar fechas', 'Confirmar certificación'],
    sources: [source('pdf', 'intake:cv.pdf')],
    skills: [
      skill({
        skill_id: 'plp:excel',
        original_term: 'hoja de cálculo',
        level: 3,
        source: 'extracted',
        confidence: 0.9,
        evidence_ids: ['ev_excel_cv'],
        normalization_notes: ['Nivel tomado del CV'],
      }),
      skill({
        skill_id: 'plp:word',
        canonical_name: 'Word',
        original_term: 'Word',
        level: 2,
        source: 'extracted',
        confidence: 0.8,
        evidence_ids: ['ev_word'],
      }),
    ],
    experiences: [
      experience({
        id: 'exp_tienda_cv',
        title: 'Ayudante de Tienda',
        organization: 'tienda familiar',
        description: 'Atendía clientes y manejaba la caja los fines de semana',
        started_at: '2022-03-01',
        evidence_ids: ['ev_tienda_cv'],
        skill_ids: ['plp:customer-service'],
        source: 'extracted',
        confidence: 0.85,
        relevance: 'relevant',
        relevance_reason: 'El CV detalla atención al cliente',
      }),
      experience({
        id: 'exp_oficina',
        title: 'Ayudante de tienda',
        organization: 'Supermercado Central',
        experience_type: 'formal_employment',
        description: 'Reposición en supermercado',
        evidence_ids: ['ev_oficina'],
        skill_ids: [],
      }),
    ],
    education: [
      education({
        id: 'edu_bachiller_cv',
        evidence_ids: ['ev_edu_cv'],
        ended_at: '2020-12-01',
        source: 'extracted',
        confidence: 0.7,
      }),
      education({
        id: 'edu_tecnico',
        program: 'Computación',
        institution: 'INA',
        level: 'technical',
        evidence_ids: ['ev_tecnico'],
      }),
    ],
    certifications: [
      certification({
        id: 'cert_excel_cv',
        name: 'Excel Básico',
        issuer: 'ina',
        issued_at: '2024-06-01',
        evidence_ids: ['ev_cert_cv'],
        skill_ids: ['plp:excel'],
        source: 'extracted',
        confidence: 0.75,
        credential_url: 'https://example.com/excel',
      }),
    ],
    evidence: [
      evidence('ev_excel_cv', 'El CV lista Excel avanzado'),
      evidence('ev_word', 'El CV lista Word'),
      evidence('ev_tienda_cv', 'Experiencia en la tienda familiar'),
      evidence('ev_oficina', 'Supermercado'),
      evidence('ev_edu_cv', 'Bachiller en el CV'),
      evidence('ev_tecnico', 'Técnico en computación'),
      evidence('ev_cert_cv', 'Certificado emitido por INA'),
    ],
  });

  it('merges duplicate skills, overlapping records and disjoint sources', () => {
    const merged = mergeCandidateProfiles(existing, incoming);

    expect(validateCandidateProfile(merged)).toEqual({ valid: true });
    expect(merged.candidate_id).toBe(existing.candidate_id);
    expect(merged.created_at).toBe(existing.created_at);
    expect(merged.updated_at).toBe(incoming.updated_at);
    expect(merged.trace_id).toBe(incoming.trace_id);
    expect(merged.sources.map((item) => item.kind)).toEqual(['text', 'pdf']);
    expect(merged.target_roles).toEqual(['Cajero', 'Auxiliar administrativo']);
    expect(merged.warnings).toEqual(['Revisar fechas', 'Confirmar certificación']);

    const excel = merged.skills.find((item) => item.skill_id === 'plp:excel');
    expect(excel?.level).toBe(3);
    expect(excel?.original_term).toBe('Excel');
    expect(excel?.source).toBe('extracted');
    expect(excel?.evidence_ids).toEqual(expect.arrayContaining(['ev_excel_chat', 'ev_excel_cv']));
    expect(merged.skills.map((item) => item.skill_id)).toEqual(
      expect.arrayContaining(['plp:excel', 'plp:customer-service', 'plp:word']),
    );

    const tienda = merged.experiences.find((item) => item.id === 'exp_tienda');
    expect(tienda?.evidence_ids).toEqual(expect.arrayContaining(['ev_tienda', 'ev_tienda_cv']));
    expect(tienda?.description).toBe('Atendía clientes y manejaba la caja los fines de semana');
    expect(tienda?.started_at).toBe('2022-03-01');
    expect(tienda?.relevance).toBe('relevant');
    expect(tienda?.skill_ids).toEqual(['plp:customer-service', 'plp:excel']);
    expect(merged.experiences.map((item) => item.id)).toEqual(['exp_tienda', 'exp_voluntariado', 'exp_oficina']);

    expect(merged.education.map((item) => item.id)).toEqual(['edu_bachiller', 'edu_curso', 'edu_tecnico']);
    expect(merged.education[0]?.evidence_ids).toEqual(expect.arrayContaining(['ev_edu', 'ev_edu_cv']));
    expect(merged.education[0]?.ended_at).toBe('2020-12-01');

    expect(merged.certifications).toHaveLength(1);
    expect(merged.certifications[0]?.id).toBe('cert_excel');
    expect(merged.certifications[0]?.issued_at).toBe('2024-06-01');
    expect(merged.certifications[0]?.skill_ids).toEqual(['plp:excel']);
    expect(merged.certifications[0]?.evidence_ids).toEqual(expect.arrayContaining(['ev_cert', 'ev_cert_cv']));
    expect(merged.certifications[0]?.status).toBe('declared');

    expect(merged.evidence.map((item) => item.id)).toEqual(
      [...merged.evidence.map((item) => item.id)].sort(),
    );
    expect(merged.evidence.map((item) => item.id)).toEqual(
      expect.arrayContaining(['ev_excel_chat', 'ev_excel_cv', 'ev_voluntariado']),
    );
    expect(profileNeedsReview(merged)).toBe(true);
  });

  it('keeps both experiences when the organization differs and does not mutate inputs', () => {
    const before = structuredClone(existing);
    const merged = mergeCandidateProfiles(existing, incoming);

    expect(existing).toEqual(before);
    const organizations = merged.experiences
      .filter((item) => item.title.toLowerCase().includes('tienda'))
      .map((item) => item.organization);
    expect(organizations).toEqual(['Tienda familiar', 'Supermercado Central']);
    expect(merged.education.filter((item) => item.program === 'Computación')).toHaveLength(2);
  });

  it('does not ask for review when the merged profile has no gaps', () => {
    const clean = profile({
      skills: [skill({ skill_id: 'plp:word', canonical_name: 'Word', original_term: 'Word', level: 2, evidence_ids: ['ev_word'] })],
      experiences: [
        experience({
          id: 'exp_1',
          title: 'Cajero',
          organization: 'Banco',
          experience_type: 'formal_employment',
          description: 'Cobré en caja',
          evidence_ids: ['ev_1'],
          relevance: 'relevant',
          relevance_reason: 'Experiencia formal',
        }),
      ],
      evidence: [evidence('ev_word', 'Word'), evidence('ev_1', 'Caja')],
      sources: [source('pdf', 'intake:a.pdf')],
    });
    const extra = profile({
      updated_at: '2026-03-01T00:00:00.000Z',
      sources: [source('text', 'intake:nota')],
      skills: [],
      experiences: [],
      evidence: [],
    });

    const merged = mergeCandidateProfiles(clean, extra);
    expect(validateCandidateProfile(merged)).toEqual({ valid: true });
    expect(profileNeedsReview(merged)).toBe(false);
    expect(merged.experiences).toHaveLength(1);
  });
});
