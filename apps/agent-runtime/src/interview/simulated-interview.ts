import { AppendOnlyAuditLog, LangfuseRecorder } from '../workflow/observability';

/**
 * Deterministic practice rubric for a target vacancy (issue #98).
 * 40 points when the answer contains the question focus,
 * 30 when it contains a digit or the word "ejemplo",
 * 30 when the trimmed answer is at least 120 characters.
 * Exactly one improvement note: the first missing criterion, or a closing note.
 */

export const FOCUS_POINTS = 40;
export const EXAMPLE_POINTS = 30;
export const DETAIL_POINTS = 30;
export const MIN_DETAILED_ANSWER_LENGTH = 120;

const FALLBACK_SKILL = 'experiencia relevante';
const FALLBACK_SITUATION = 'trabajo en equipo';

export const NOTE_MISSING_EXAMPLE = 'Agrega un ejemplo concreto o un resultado medible.';
export const NOTE_TOO_SHORT = 'Amplía la respuesta hasta explicar qué hiciste y qué resultó.';
export const NOTE_STRONG = 'Cierra nombrando el resultado para el equipo o el cliente.';

export function NOTE_MISSING_FOCUS(focus: string): string {
  return `Incluye "${focus}" en la respuesta con un caso de tu experiencia.`;
}

export interface InterviewVacancy {
  vacancyId: string;
  title: string;
  skills?: readonly string[];
}

export interface PracticeQuestion {
  id: string;
  prompt: string;
  focus: string;
}

export interface InterviewAnswer {
  questionId: string;
  text: string;
}

export interface InterviewAnswerScore {
  questionId: string;
  score: number;
  improvementNote: string;
}

export interface InterviewTurn {
  turnId: string;
  candidateId: string;
  vacancyId: string;
  traceId: string;
  spanId: string;
  questions: PracticeQuestion[];
  answers: InterviewAnswer[];
  scores: InterviewAnswerScore[];
  createdAt: string;
}

export interface InterviewTurnStore {
  save(turn: InterviewTurn): void;
  get(turnId: string): InterviewTurn | undefined;
  listByCandidate(candidateId: string): readonly InterviewTurn[];
}

export interface SimulatedInterviewPorts {
  turns: InterviewTurnStore;
  audit: AppendOnlyAuditLog;
  traces: LangfuseRecorder;
  clock: () => string;
  nextId: (prefix: string) => string;
}

export interface SimulatedInterviewRequest {
  candidateId: string;
  vacancy: InterviewVacancy;
  answers: readonly InterviewAnswer[];
}

export interface SimulatedInterviewResult {
  candidateId: string;
  vacancyId: string;
  questions: PracticeQuestion[];
  scores: InterviewAnswerScore[];
  turnId: string;
  traceId: string;
  spanId: string;
  auditSequence: number;
}

export class UnknownInterviewQuestionError extends Error {
  constructor(readonly questionId: string) {
    super(`Unknown practice question: ${questionId}`);
    this.name = 'UnknownInterviewQuestionError';
  }
}

export function createInterviewTurnStore(): InterviewTurnStore {
  const turns = new Map<string, InterviewTurn>();
  return {
    save(turn) {
      turns.set(turn.turnId, turn);
    },
    get(turnId) {
      return turns.get(turnId);
    },
    listByCandidate(candidateId) {
      return [...turns.values()].filter((turn) => turn.candidateId === candidateId);
    },
  };
}

function createRuntime(): SimulatedInterviewPorts {
  let sequence = 0;
  const clock = () => new Date().toISOString();
  return {
    turns: createInterviewTurnStore(),
    audit: new AppendOnlyAuditLog(),
    traces: new LangfuseRecorder(),
    clock,
    nextId(prefix: string) {
      sequence += 1;
      return `${prefix}.${clock().replace(/[^0-9]/g, '')}.${sequence}`;
    },
  };
}

let runtime = createRuntime();

export function getSimulatedInterviewRuntime(): SimulatedInterviewPorts {
  return runtime;
}

export function resetSimulatedInterviewRuntime(): void {
  runtime = createRuntime();
}

function normalize(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

function presentSkills(skills: readonly string[] | undefined): string[] {
  return (skills ?? []).map((skill) => skill.trim()).filter((skill) => skill.length > 0);
}

/** Three practice questions derived only from the target vacancy. */
export function practiceQuestions(vacancy: InterviewVacancy): PracticeQuestion[] {
  const title = vacancy.title.trim();
  const skills = presentSkills(vacancy.skills);
  const skill = skills[0] ?? FALLBACK_SKILL;
  const situation = skills[1] ?? FALLBACK_SITUATION;
  const questions: PracticeQuestion[] = [
    {
      id: `${vacancy.vacancyId}:motivacion`,
      prompt: `¿Por qué te interesa el puesto de ${title}?`,
      focus: title,
    },
    {
      id: `${vacancy.vacancyId}:habilidad`,
      prompt: `Cuéntame una experiencia en la que aplicaste ${skill}.`,
      focus: skill,
    },
    {
      id: `${vacancy.vacancyId}:situacion`,
      prompt: `Describe una situación en la que demostraste ${situation} en un trabajo similar a ${title}.`,
      focus: situation,
    },
  ];
  return questions;
}

function hasExample(answer: string): boolean {
  return /\d/.test(answer) || /\bejemplo\b/i.test(normalize(answer));
}

/** Score one answer. The same text always yields the same score and note. */
export function scoreInterviewAnswer(question: PracticeQuestion, answer: string): InterviewAnswerScore {
  const trimmed = answer.trim();
  const focusHit = normalize(trimmed).includes(normalize(question.focus));
  const exampleHit = hasExample(trimmed);
  const detailHit = trimmed.length >= MIN_DETAILED_ANSWER_LENGTH;
  const score =
    (focusHit ? FOCUS_POINTS : 0) +
    (exampleHit ? EXAMPLE_POINTS : 0) +
    (detailHit ? DETAIL_POINTS : 0);
  const improvementNote = !focusHit
    ? NOTE_MISSING_FOCUS(question.focus)
    : !exampleHit
      ? NOTE_MISSING_EXAMPLE
      : !detailHit
        ? NOTE_TOO_SHORT
        : NOTE_STRONG;
  return { questionId: question.id, score, improvementNote };
}

/**
 * Practice one turn for a vacancy: questions, a rubric score per submitted
 * answer, a persisted turn, a closed span, and one audit event.
 */
export function runSimulatedInterview(
  request: SimulatedInterviewRequest,
  ports: SimulatedInterviewPorts = getSimulatedInterviewRuntime(),
): SimulatedInterviewResult {
  const questions = practiceQuestions(request.vacancy);
  const byId = new Map(questions.map((item) => [item.id, item]));
  const scores = request.answers.map((answer) => {
    const question = byId.get(answer.questionId);
    if (!question) throw new UnknownInterviewQuestionError(answer.questionId);
    return scoreInterviewAnswer(question, answer.text);
  });

  const createdAt = ports.clock();
  const traceId = ports.nextId('trace.interview');
  const spanId = ports.nextId('span.interview');
  const turnId = ports.nextId('turn.interview');

  ports.traces.startTrace({
    id: traceId,
    name: 'simulated_interview',
    timestamp: createdAt,
    metadata: { candidateId: request.candidateId, vacancyId: request.vacancy.vacancyId },
  });
  ports.traces.startSpan({
    id: spanId,
    traceId,
    name: 'simulated_interview',
    startTime: createdAt,
    input: { vacancyId: request.vacancy.vacancyId, questionIds: questions.map((item) => item.id) },
    metadata: { agent: 'simulated_interview', candidateId: request.candidateId },
  });
  const span = ports.traces.endSpan(spanId, {
    endTime: createdAt,
    output: { questionCount: questions.length, scores },
    metadata: { deterministic: true },
  });
  const auditEvent = ports.audit.append({
    trace_id: traceId,
    timestamp: createdAt,
    actor: request.candidateId,
    role: 'candidate',
    agent: 'runtime',
    tool: 'simulated_interview',
    evidence: request.vacancy.vacancyId,
    constraint: null,
    modelFallback: null,
    action: 'simulated_interview_turn',
  });

  const turn: InterviewTurn = {
    turnId,
    candidateId: request.candidateId,
    vacancyId: request.vacancy.vacancyId,
    traceId,
    spanId: span.id,
    questions,
    answers: request.answers.map((answer) => ({ ...answer })),
    scores,
    createdAt,
  };
  ports.turns.save(turn);

  return {
    candidateId: request.candidateId,
    vacancyId: request.vacancy.vacancyId,
    questions,
    scores,
    turnId,
    traceId,
    spanId: span.id,
    auditSequence: auditEvent.sequence,
  };
}
