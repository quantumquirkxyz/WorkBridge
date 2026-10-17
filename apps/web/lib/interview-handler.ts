import {
  runSimulatedInterview,
  UnknownInterviewQuestionError,
  getSimulatedInterviewRuntime,
  type InterviewAnswer,
  type InterviewVacancy,
  type SimulatedInterviewPorts,
} from '@workbridge/agent-runtime';
import type { HandlerResult } from './handler-result';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseVacancy(value: unknown): InterviewVacancy | undefined {
  if (!isRecord(value)) return undefined;
  const { vacancyId, title, skills } = value;
  if (typeof vacancyId !== 'string' || vacancyId.trim() === '') return undefined;
  if (typeof title !== 'string' || title.trim() === '') return undefined;
  if (
    skills !== undefined &&
    (!Array.isArray(skills) || skills.some((skill) => typeof skill !== 'string' || skill.trim() === ''))
  ) {
    return undefined;
  }
  return {
    vacancyId: vacancyId.trim(),
    title: title.trim(),
    skills: Array.isArray(skills) ? skills.map((skill) => skill.trim()) : undefined,
  };
}

function parseAnswers(value: unknown): InterviewAnswer[] | undefined {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return undefined;
  const answers: InterviewAnswer[] = [];
  for (const item of value) {
    if (
      !isRecord(item) ||
      typeof item.questionId !== 'string' ||
      item.questionId.trim() === '' ||
      typeof item.text !== 'string'
    ) {
      return undefined;
    }
    answers.push({ questionId: item.questionId.trim(), text: item.text });
  }
  return answers;
}

/**
 * Run one simulated-interview turn. The candidate id is supplied by the route
 * from the session; a candidate id in the body is never read.
 */
export function handleSimulatedInterview(
  candidateId: string,
  payload: unknown,
  ports: SimulatedInterviewPorts = getSimulatedInterviewRuntime(),
): HandlerResult {
  if (!isRecord(payload)) {
    return { status: 400, body: { error: 'invalid_interview_request', details: ['El cuerpo debe ser un objeto.'] } };
  }
  const vacancy = parseVacancy(payload.vacancy);
  const answers = parseAnswers(payload.answers);
  if (!vacancy || !answers) {
    return {
      status: 400,
      body: {
        error: 'invalid_interview_request',
        details: ['Se requiere vacancy.vacancyId, vacancy.title y answers como lista de questionId y text.'],
      },
    };
  }
  try {
    return { status: 200, body: runSimulatedInterview({ candidateId, vacancy, answers }, ports) };
  } catch (error) {
    if (error instanceof UnknownInterviewQuestionError) {
      return { status: 400, body: { error: 'unknown_question', details: [error.message] } };
    }
    throw error;
  }
}
