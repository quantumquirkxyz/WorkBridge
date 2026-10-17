import { createHash } from 'node:crypto';

export const CHAT_QUEUE_LIMIT = 1000;
export const CHAT_METRIC_NAMES = [
  'workbridge_chat_queue_depth',
  'workbridge_chat_oldest_job_age_seconds',
  'workbridge_chat_job_attempts_total',
  'workbridge_chat_job_duration_seconds',
  'workbridge_chat_worker_errors_total',
  'workbridge_chat_dead_letters_total',
  'workbridge_chat_session_conflicts_total',
  'workbridge_chat_provider_timeouts_total',
] as const;

export const CHAT_ALERT_RULES = {
  oldestJobAge: { metric: 'workbridge_chat_oldest_job_age_seconds', threshold: 60, forSeconds: 300 },
  workerErrorRate: { metric: 'workbridge_chat_worker_errors_total / workbridge_chat_job_attempts_total', threshold: 0.05, forSeconds: 600 },
} as const;

export interface ChatQueueMetrics {
  queueDepth: number;
  oldestJobAgeSeconds: number;
  attempts: number;
  durationsSeconds: number[];
  workerErrors: number;
  deadLetters: number;
  sessionConflicts: number;
  providerTimeouts: number;
}

const metrics: ChatQueueMetrics = {
  queueDepth: 0, oldestJobAgeSeconds: 0, attempts: 0, durationsSeconds: [],
  workerErrors: 0, deadLetters: 0, sessionConflicts: 0, providerTimeouts: 0,
};
let oldestAgeSince: number | undefined;
const attemptsAt: number[] = [];
const errorsAt: number[] = [];
let errorRateAboveSince: number | undefined;

/** Stable 64-bit correlation hash; never log the candidate identifier itself. */
export function candidateHash(id: string): string {
  return createHash('sha256').update(id).digest('hex').slice(0, 16);
}

export function observeChatQueue(update: Partial<ChatQueueMetrics>, now = Date.now()): void {
  Object.assign(metrics, update);
  if (metrics.oldestJobAgeSeconds > CHAT_ALERT_RULES.oldestJobAge.threshold) oldestAgeSince ??= now;
  else oldestAgeSince = undefined;
}

export function observeChatJob(event: 'attempt' | 'worker_error' | 'dead_letter' | 'session_conflict' | 'provider_timeout' | 'duration', durationSeconds?: number, now = Date.now()): void {
  if (event === 'attempt') { metrics.attempts += 1; attemptsAt.push(now); }
  if (event === 'worker_error') { metrics.workerErrors += 1; errorsAt.push(now); }
  if (event === 'dead_letter') metrics.deadLetters += 1;
  if (event === 'session_conflict') metrics.sessionConflicts += 1;
  if (event === 'provider_timeout') metrics.providerTimeouts += 1;
  if (event === 'duration' && durationSeconds !== undefined) metrics.durationsSeconds.push(durationSeconds);
  const errorRate = attemptsAt.length > 0 ? errorsAt.length / attemptsAt.length : 0;
  if (errorRate > CHAT_ALERT_RULES.workerErrorRate.threshold) errorRateAboveSince ??= now;
  else errorRateAboveSince = undefined;
}

export function getChatQueueMetrics(): ChatQueueMetrics {
  return { ...metrics, durationsSeconds: [...metrics.durationsSeconds] };
}

export function evaluateChatAlerts(now = Date.now()): string[] {
  const alerts: string[] = [];
  const windowStart = now - CHAT_ALERT_RULES.workerErrorRate.forSeconds * 1000;
  while (attemptsAt[0] !== undefined && attemptsAt[0] < windowStart) attemptsAt.shift();
  while (errorsAt[0] !== undefined && errorsAt[0] < windowStart) errorsAt.shift();
  const currentErrorRate = attemptsAt.length === 0 ? 0 : errorsAt.length / attemptsAt.length;
  if (currentErrorRate > CHAT_ALERT_RULES.workerErrorRate.threshold) errorRateAboveSince ??= now;
  else errorRateAboveSince = undefined;
  if (oldestAgeSince !== undefined && now - oldestAgeSince >= CHAT_ALERT_RULES.oldestJobAge.forSeconds * 1000) alerts.push('chat_queue_oldest_job_age');
  if (errorRateAboveSince !== undefined && now - errorRateAboveSince >= CHAT_ALERT_RULES.workerErrorRate.forSeconds * 1000) alerts.push('chat_worker_error_rate');
  return alerts;
}

export function resetChatQueueMetrics(): void {
  Object.assign(metrics, { queueDepth: 0, oldestJobAgeSeconds: 0, attempts: 0, durationsSeconds: [], workerErrors: 0, deadLetters: 0, sessionConflicts: 0, providerTimeouts: 0 });
  oldestAgeSince = undefined;
  attemptsAt.length = 0;
  errorsAt.length = 0;
  errorRateAboveSince = undefined;
}
