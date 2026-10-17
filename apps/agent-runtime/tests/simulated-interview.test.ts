import { describe, expect, it } from 'vitest';
import { AppendOnlyAuditLog, LangfuseRecorder } from '../src/workflow/observability';
import {
  NOTE_MISSING_EXAMPLE,
  NOTE_MISSING_FOCUS,
  NOTE_STRONG,
  NOTE_TOO_SHORT,
  createInterviewTurnStore,
  practiceQuestions,
  runSimulatedInterview,
  scoreInterviewAnswer,
  type PracticeQuestion,
  type SimulatedInterviewPorts,
} from '../src/interview/simulated-interview';

/**
 * Rubric for issue #98, fixed before the scorer existed:
 * 40 points when the answer contains the question focus,
 * 30 when it contains a digit or the word "ejemplo",
 * 30 when the trimmed answer is at least 120 characters.
 * Exactly one improvement note, chosen from the first gap in that order.
 */
const VACANCY = {
  vacancyId: 'vac-cajero',
  title: 'Cajero',
  skills: ['atención al cliente', 'caja'],
};

const STRONG_ANSWER =
  'En atención al cliente resolví 40 reclamos por semana, expliqué el proceso con un ejemplo y acompañé al cliente hasta el cierre del caso en la sucursal de caja.';

function question(focus: string): PracticeQuestion {
  return { id: 'vac-cajero:habilidad', prompt: 'Cuéntame una experiencia.', focus };
}

describe('simulated interview questions', () => {
  it('returns three practice questions for a target vacancy', () => {
    const questions = practiceQuestions(VACANCY);
    expect(questions).toHaveLength(3);
    expect(questions.map((item) => item.id)).toEqual([
      'vac-cajero:motivacion',
      'vac-cajero:habilidad',
      'vac-cajero:situacion',
    ]);
    expect(questions[0]?.focus).toBe('Cajero');
    expect(questions[1]?.focus).toBe('atención al cliente');
    expect(questions[2]?.focus).toBe('caja');
    expect(questions[0]?.prompt).toContain('Cajero');
  });
});

describe('simulated interview rubric', () => {
  const focus = 'atención al cliente';

  it('scores a strong answer at 100 with the closing improvement note', () => {
    expect(STRONG_ANSWER.trim().length).toBeGreaterThanOrEqual(120);
    const first = scoreInterviewAnswer(question(focus), STRONG_ANSWER);
    const second = scoreInterviewAnswer(question(focus), STRONG_ANSWER);
    expect(first).toEqual({
      questionId: 'vac-cajero:habilidad',
      score: 100,
      improvementNote: NOTE_STRONG,
    });
    expect(second).toEqual(first);
  });

  it('scores a weak answer at 0 and asks for the missing focus', () => {
    expect(scoreInterviewAnswer(question(focus), 'no sé')).toEqual({
      questionId: 'vac-cajero:habilidad',
      score: 0,
      improvementNote: NOTE_MISSING_FOCUS(focus),
    });
  });

  it('names the first missing criterion when the answer is only partial', () => {
    const withFocus = 'Trabajé en atención al cliente durante un tiempo corto.';
    expect(scoreInterviewAnswer(question(focus), withFocus)).toEqual({
      questionId: 'vac-cajero:habilidad',
      score: 40,
      improvementNote: NOTE_MISSING_EXAMPLE,
    });

    const withExample = 'Resolví 12 casos pero no nombro la habilidad pedida en esta respuesta breve.';
    expect(scoreInterviewAnswer(question(focus), withExample)).toEqual({
      questionId: 'vac-cajero:habilidad',
      score: 30,
      improvementNote: NOTE_MISSING_FOCUS(focus),
    });

    const detailedWithoutExample =
      'En atención al cliente escuché al cliente, ordené el reclamo y lo acompañé hasta que entendió el siguiente paso del proceso de la sucursal.';
    expect(detailedWithoutExample.trim().length).toBeGreaterThanOrEqual(120);
    expect(scoreInterviewAnswer(question(focus), detailedWithoutExample)).toEqual({
      questionId: 'vac-cajero:habilidad',
      score: 70,
      improvementNote: NOTE_MISSING_EXAMPLE,
    });

    const shortWithExample = 'En atención al cliente resolví 4 casos, por ejemplo uno de cambio.';
    expect(shortWithExample.trim().length).toBeLessThan(120);
    expect(scoreInterviewAnswer(question(focus), shortWithExample)).toEqual({
      questionId: 'vac-cajero:habilidad',
      score: 70,
      improvementNote: NOTE_TOO_SHORT,
    });
  });
});

function ports(): SimulatedInterviewPorts {
  let sequence = 0;
  return {
    turns: createInterviewTurnStore(),
    audit: new AppendOnlyAuditLog(),
    traces: new LangfuseRecorder(),
    clock: () => '2026-10-17T12:00:00.000Z',
    nextId(prefix: string) {
      sequence += 1;
      return `${prefix}.${sequence}`;
    },
  };
}

describe('simulated interview turn', () => {
  it('persists the turn and records a span plus an audit event', () => {
    const runtime = ports();
    const result = runSimulatedInterview(
      {
        candidateId: 'candidate_owner',
        vacancy: VACANCY,
        answers: [
          { questionId: 'vac-cajero:habilidad', text: STRONG_ANSWER },
          { questionId: 'vac-cajero:situacion', text: 'no sé' },
        ],
      },
      runtime,
    );

    expect(result.questions).toHaveLength(3);
    expect(result.scores[0]).toEqual({
      questionId: 'vac-cajero:habilidad',
      score: 100,
      improvementNote: NOTE_STRONG,
    });
    expect(result.scores[1]).toEqual({
      questionId: 'vac-cajero:situacion',
      score: 0,
      improvementNote: NOTE_MISSING_FOCUS('caja'),
    });

    const stored = runtime.turns.get(result.turnId);
    expect(stored?.candidateId).toBe('candidate_owner');
    expect(stored?.vacancyId).toBe('vac-cajero');
    expect(stored?.questions).toHaveLength(3);
    expect(stored?.answers).toEqual([
      { questionId: 'vac-cajero:habilidad', text: STRONG_ANSWER },
      { questionId: 'vac-cajero:situacion', text: 'no sé' },
    ]);

    const traced = runtime.traces.tracesFor(result.traceId);
    expect(traced.trace?.name).toBe('simulated_interview');
    expect(traced.spans).toHaveLength(1);
    expect(traced.spans[0]?.name).toBe('simulated_interview');
    expect(traced.spans[0]?.endTime).toBe('2026-10-17T12:00:00.000Z');

    expect(runtime.audit.read()).toEqual([
      expect.objectContaining({
        sequence: result.auditSequence,
        trace_id: result.traceId,
        actor: 'candidate_owner',
        role: 'candidate',
        tool: 'simulated_interview',
        evidence: 'vac-cajero',
        action: 'simulated_interview_turn',
      }),
    ]);
  });
});
