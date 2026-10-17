import { describe, expect, it, beforeEach } from 'vitest';
import { candidateHash, evaluateChatAlerts, getChatQueueMetrics, observeChatJob, observeChatQueue, resetChatQueueMetrics } from '../lib/chat-observability';
import { GET as getMetrics } from '../app/api/health/chat/metrics/route';

describe('chat observability', () => {
  beforeEach(() => resetChatQueueMetrics());

  it('uses stable redacted candidate hashes and exposes all metric fields', () => {
    expect(candidateHash('candidate-a')).toHaveLength(16);
    expect(candidateHash('candidate-a')).toBe(candidateHash('candidate-a'));
    expect(candidateHash('candidate-a')).not.toContain('candidate-a');
    expect(Object.keys(getChatQueueMetrics())).toEqual(expect.arrayContaining(['queueDepth', 'oldestJobAgeSeconds', 'attempts', 'durationsSeconds', 'workerErrors', 'deadLetters', 'sessionConflicts', 'providerTimeouts']));
  });

  it('requires the configured alert windows', () => {
    observeChatQueue({ oldestJobAgeSeconds: 61 }, 0);
    observeChatJob('attempt', undefined, 0);
    observeChatJob('worker_error', undefined, 0);
    expect(evaluateChatAlerts(299_999)).toEqual([]);
    expect(evaluateChatAlerts(300_000)).toContain('chat_queue_oldest_job_age');
    expect(evaluateChatAlerts(599_999)).not.toContain('chat_worker_error_rate');
    expect(evaluateChatAlerts(600_000)).toContain('chat_worker_error_rate');
  });

  it('protects and labels the operator metrics endpoint', async () => {
    const previousToken = process.env.CHAT_METRICS_TOKEN;
    const previousPersistence = process.env.WORKBRIDGE_PERSISTENCE;
    process.env.CHAT_METRICS_TOKEN = 'test-token';
    process.env.WORKBRIDGE_PERSISTENCE = 'memory';
    try {
      expect((await getMetrics(new Request('http://localhost'))).status).toBe(401);
      const response = await getMetrics(new Request('http://localhost', { headers: { authorization: 'Bearer test-token' } }));
      const body = await response.json() as { metrics: Array<{ name: string; labels: { service: string } }> };
      expect(response.status).toBe(200);
      expect(body.metrics).toHaveLength(8);
      expect(body.metrics.every((metric) => metric.labels.service === 'chat')).toBe(true);
    } finally {
      if (previousToken === undefined) delete process.env.CHAT_METRICS_TOKEN; else process.env.CHAT_METRICS_TOKEN = previousToken;
      if (previousPersistence === undefined) delete process.env.WORKBRIDGE_PERSISTENCE; else process.env.WORKBRIDGE_PERSISTENCE = previousPersistence;
    }
  });
});
