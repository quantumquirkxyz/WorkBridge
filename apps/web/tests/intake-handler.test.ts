import { describe, expect, it, vi } from 'vitest';
import { validateIntakeResult, type CandidateProfile } from '@puente/domain';
import { createProfileAgent, type ProfileAgent } from '@puente/agent-runtime';
import { handleIntake } from '../lib/intake-handler';
import { createInMemoryProfileStore } from '../lib/profile-store';

const CV = [
  'Ayudaba en la tienda de mi familia los fines de semana, atendiendo clientes y manejando la caja.',
  'Habilidades: Excel, atención al cliente y trabajo en equipo.',
].join('\n');

function stubAgent(overrides: Partial<ProfileAgent>): ProfileAgent {
  return overrides as unknown as ProfileAgent;
}

describe('handleIntake', () => {
  it('accepts pasted text and returns a schema-valid IntakeResult', async () => {
    const { status, body } = await handleIntake({
      kind: 'text',
      text: CV,
      targetRoles: ['Atención al cliente'],
    });

    expect(status).toBe(200);
    expect(validateIntakeResult(body)).toEqual({ valid: true });
    const result = body as { profile: { experiences: Array<{ experience_type: string }> } };
    expect(result.profile.experiences.some((experience) => experience.experience_type === 'family_business')).toBe(
      true,
    );
  });

  it.each([
    ['audio_transcript', { kind: 'audio_transcript', text: CV }],
    ['image', { kind: 'image', fileName: 'cv.png', mimeType: 'image/png', contentBase64: 'aGVsbG8=', altText: CV }],
    ['pdf', { kind: 'pdf', fileName: 'cv.pdf', mimeType: 'application/pdf', contentBase64: 'aGVsbG8=' }],
  ] as const)('accepts %s intake through the profile seam', async (_label, payload) => {
    const agent = createProfileAgent({
      now: () => new Date('2026-01-01T00:00:00.000Z'),
      ocr: { name: 'test-ocr', extract: async () => ({ text: CV, confidence: 1, method: 'test-ocr' }) },
      pdf: async () => ({ text: CV, pageCount: 1 }),
    });

    const { status, body } = await handleIntake(payload, { agent });

    expect(status).toBe(200);
    expect(validateIntakeResult(body)).toEqual({ valid: true });
    expect((body as { profile: { sources: Array<{ kind: string }> } }).profile.sources[0]?.kind).toBe(payload.kind);
    const profile = (body as { profile: CandidateProfile }).profile;
    expect(profile.sources[0]?.ref).toContain('intake:');
    expect(profile.sources[0]?.extraction_method).toBeTruthy();
    expect(profile.experiences.some((experience) => ['relevant', 'partially_relevant', 'not_relevant', 'requires_additional_evidence'].includes(experience.relevance))).toBe(true);
    for (const skill of profile.skills) {
      expect(skill.level).toBeGreaterThanOrEqual(0);
      expect(skill.level).toBeLessThanOrEqual(4);
      expect(skill.evidence_ids.length).toBeGreaterThan(0);
      expect(skill.source).toBeTruthy();
      expect(skill.confidence).toBeGreaterThanOrEqual(0);
    }
  });

  it('persists the validated profile JSON document', async () => {
    const store = createInMemoryProfileStore();
    const { body } = await handleIntake({ kind: 'text', text: CV, candidateId: 'candidate_persisted' }, { profileStore: store });
    const profile = (body as { profile: CandidateProfile }).profile;
    expect(store.get(profile.candidate_id)).toEqual(profile);
    expect(store.get(profile.candidate_id)).not.toBe(profile);
  });

  it('rejects a request that violates the IntakeRequest contract', async () => {
    const { status, body } = await handleIntake({ text: 'sin tipo' });
    expect(status).toBe(400);
    expect(body).toMatchObject({ error: 'invalid_intake_request' });
    expect((body as { details: string[] }).details.length).toBeGreaterThan(0);
  });

  it('rejects a PDF source that carries no base64 content', async () => {
    const { status, body } = await handleIntake({ kind: 'pdf', fileName: 'cv.pdf' });
    expect(status).toBe(400);
    expect(body).toMatchObject({ error: 'invalid_intake_request' });
  });

  it('returns 422 with the trace id when the agent throws', async () => {
    const agent = stubAgent({
      run: vi.fn(async () => {
        throw new Error('provider down');
      }) as unknown as ProfileAgent['run'],
    });

    const { status, body } = await handleIntake(
      { kind: 'text', text: CV, traceId: 'trace_manual' },
      { agent },
    );

    expect(status).toBe(422);
    expect(body).toEqual({ error: 'intake_failed', message: 'provider down', trace_id: 'trace_manual' });
  });

  it('merges a later intake for the same candidate instead of replacing the profile', async () => {
    const store = createInMemoryProfileStore();
    const candidateId = 'candidate_merge';
    const pdfText = 'Trabajé en una oficina usando Word y Python para reportes.';
    const textAgent = createProfileAgent({ now: () => new Date('2026-01-01T00:00:00.000Z') });
    const pdfAgent = createProfileAgent({
      now: () => new Date('2026-02-01T00:00:00.000Z'),
      pdf: async () => ({ text: pdfText, pageCount: 1 }),
    });

    const first = await handleIntake(
      { kind: 'text', text: CV, candidateId },
      { agent: textAgent, profileStore: store },
    );
    const firstProfile = (first.body as { profile: CandidateProfile }).profile;
    expect(first.status).toBe(200);
    expect(firstProfile.sources).toHaveLength(1);
    expect(firstProfile.created_at).toBe(firstProfile.updated_at);

    const second = await handleIntake(
      {
        kind: 'pdf',
        fileName: 'cv.pdf',
        mimeType: 'application/pdf',
        contentBase64: 'aGVsbG8=',
        candidateId,
      },
      { agent: pdfAgent, profileStore: store },
    );

    expect(second.status).toBe(200);
    const profile = (second.body as { profile: CandidateProfile }).profile;
    expect(profile.sources.map((item) => item.kind)).toEqual(['text', 'pdf']);
    expect(profile.created_at).toBe(firstProfile.created_at);
    expect(profile.updated_at).toBe('2026-02-01T00:00:00.000Z');
    expect(profile.skills.map((skill) => skill.skill_id)).toEqual(
      expect.arrayContaining(['plp:excel', 'plp:customer-service', 'plp:word', 'plp:python']),
    );
    expect(store.get(profile.candidate_id)).toEqual(profile);
  });

  it('derives a deterministic trace id when none is supplied', async () => {
    const agent = stubAgent({
      run: vi.fn(async () => {
        throw new Error('boom');
      }) as unknown as ProfileAgent['run'],
    });

    const first = await handleIntake({ kind: 'text', text: CV }, { agent });
    const second = await handleIntake({ kind: 'text', text: CV }, { agent });

    expect((first.body as { trace_id: string }).trace_id).toBe(
      (second.body as { trace_id: string }).trace_id,
    );
  });
});
