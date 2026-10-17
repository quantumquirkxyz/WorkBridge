import { describe, expect, it, vi } from 'vitest';
import { validateIntakeResult } from '@puente/domain';
import type { ProfileAgent } from '@puente/agent-runtime';
import { handleIntake } from '../lib/intake-handler';

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
