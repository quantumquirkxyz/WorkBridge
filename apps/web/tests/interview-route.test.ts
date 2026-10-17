import { beforeEach, describe, expect, it } from 'vitest';
import {
  NOTE_MISSING_FOCUS,
  NOTE_STRONG,
  getSimulatedInterviewRuntime,
  resetSimulatedInterviewRuntime,
  signBetterAuthSession,
} from '@workbridge/agent-runtime';
import { makeCandidateId } from '@workbridge/domain';
import { POST } from '../app/api/interview/route';

const STRONG_ANSWER =
  'En atención al cliente resolví 40 reclamos por semana, expliqué el proceso con un ejemplo y acompañé al cliente hasta el cierre del caso en la sucursal de caja.';

const VACANCY = {
  vacancyId: 'vac-cajero',
  title: 'Cajero',
  skills: ['atención al cliente', 'caja'],
};

function post(body: unknown, signed = false): Request {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (signed) {
    headers['x-better-auth-session'] = JSON.stringify(signBetterAuthSession({
      session: { id: 'session-u', userId: 'u', expiresAt: new Date(Date.now() + 60_000).toISOString() },
      user: { id: 'u', email: 'u@example.test', role: 'candidate' },
    }, process.env.BETTER_AUTH_SECRET ?? 'test-secret'));
  }
  return new Request('http://localhost/api/interview', { method: 'POST', headers, body: JSON.stringify(body) });
}

describe('POST /api/interview', () => {
  beforeEach(() => {
    process.env.BETTER_AUTH_SECRET = 'test-secret';
    resetSimulatedInterviewRuntime();
  });

  it('returns 401 when there is no session, even if the body names a candidate', async () => {
    const response = await POST(post({ vacancy: VACANCY, candidateId: 'candidate_victim' }));
    expect(response.status).toBe(401);
    expect(getSimulatedInterviewRuntime().turns.listByCandidate('candidate_victim')).toHaveLength(0);
  });

  it('returns questions, a deterministic score, an improvement note, and trace records for the session candidate', async () => {
    const owner = makeCandidateId('u');
    const response = await POST(post({
      vacancy: VACANCY,
      candidateId: 'candidate_victim',
      answers: [
        { questionId: 'vac-cajero:habilidad', text: STRONG_ANSWER },
        { questionId: 'vac-cajero:situacion', text: 'no sé' },
      ],
    }, true));

    expect(response.status).toBe(200);
    const body = await response.json() as {
      candidateId: string;
      questions: unknown[];
      scores: Array<{ questionId: string; score: number; improvementNote: string }>;
      traceId: string;
      turnId: string;
    };
    expect(body.candidateId).toBe(owner);
    expect(body.candidateId).not.toBe('candidate_victim');
    expect(body.questions.length).toBeGreaterThanOrEqual(3);
    expect(body.scores[0]).toEqual({
      questionId: 'vac-cajero:habilidad',
      score: 100,
      improvementNote: NOTE_STRONG,
    });
    expect(body.scores[1]).toEqual({
      questionId: 'vac-cajero:situacion',
      score: 0,
      improvementNote: NOTE_MISSING_FOCUS('caja'),
    });

    const runtime = getSimulatedInterviewRuntime();
    expect(runtime.turns.get(body.turnId)?.candidateId).toBe(owner);
    expect(runtime.turns.listByCandidate('candidate_victim')).toHaveLength(0);
    const traced = runtime.traces.tracesFor(body.traceId);
    expect(traced.spans[0]?.endTime).toBeTruthy();
    expect(traced.spans[0]?.name).toBe('simulated_interview');
    expect(runtime.audit.read()).toEqual([
      expect.objectContaining({
        trace_id: body.traceId,
        actor: owner,
        action: 'simulated_interview_turn',
        evidence: 'vac-cajero',
      }),
    ]);

    const again = await POST(post({
      vacancy: VACANCY,
      answers: [{ questionId: 'vac-cajero:habilidad', text: STRONG_ANSWER }],
    }, true));
    const repeated = await again.json() as { scores: Array<{ score: number; improvementNote: string }> };
    expect(repeated.scores[0]).toEqual(body.scores[0]);
  });

  it('rejects a vacancy that does not match the practice questions', async () => {
    const response = await POST(post({
      vacancy: VACANCY,
      answers: [{ questionId: 'vac-otro:habilidad', text: 'no sé' }],
    }, true));
    expect(response.status).toBe(400);
    const body = await response.json() as { error: string };
    expect(body.error).toBe('unknown_question');
  });
});
