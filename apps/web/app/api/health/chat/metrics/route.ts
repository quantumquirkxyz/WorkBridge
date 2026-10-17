import { NextResponse } from 'next/server';
import { CHAT_METRIC_NAMES, evaluateChatAlerts, getChatQueueMetrics } from '../../../../../lib/chat-observability';
import { createNeonChatJobQuery } from '../../../../../lib/chat-jobs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Operator-only queue metrics; transcript and candidate identity data never leave this process. */
export async function GET(request: Request): Promise<Response> {
  const expected = process.env.CHAT_METRICS_TOKEN;
  if (!expected || request.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  let snapshot = getChatQueueMetrics();
  let persistedAlerts: string[] = [];
  if (process.env.WORKBRIDGE_PERSISTENCE !== 'memory') {
    try {
      const query = createNeonChatJobQuery();
      await query("update chat_queue_metrics set oldest_alert_since = case when (select coalesce(extract(epoch from (now() - min(created_at))), 0) from chat_jobs where status = 'queued') > 60 then coalesce(oldest_alert_since, now()) else null end, updated_at = now() where metric_key = 'chat'", []);
      const [queue, totals] = await Promise.all([
        query("select count(*)::int as depth, coalesce(extract(epoch from (now() - min(created_at))), 0)::int as oldest from chat_jobs where status = 'queued'", []),
        query("select attempts, worker_errors, dead_letters, session_conflicts, provider_timeouts, duration_seconds_total, duration_samples, oldest_alert_since, error_alert_since from chat_queue_metrics where metric_key = 'chat'", []),
      ]);
      const row = totals.rows[0] ?? {};
      const oldestSince = row.oldest_alert_since ? Date.parse(String(row.oldest_alert_since)) : undefined;
      const errorSince = row.error_alert_since ? Date.parse(String(row.error_alert_since)) : undefined;
      const now = Date.now();
      persistedAlerts = [oldestSince !== undefined && now - oldestSince >= 300_000 ? 'chat_queue_oldest_job_age' : null, errorSince !== undefined && now - errorSince >= 600_000 ? 'chat_worker_error_rate' : null].filter((value): value is string => value !== null);
      snapshot = { queueDepth: Number(queue.rows[0]?.depth ?? 0), oldestJobAgeSeconds: Number(queue.rows[0]?.oldest ?? 0), attempts: Number(row.attempts ?? 0), durationsSeconds: Number(row.duration_samples ?? 0) > 0 ? [Number(row.duration_seconds_total ?? 0) / Number(row.duration_samples)] : [], workerErrors: Number(row.worker_errors ?? 0), deadLetters: Number(row.dead_letters ?? 0), sessionConflicts: Number(row.session_conflicts ?? 0), providerTimeouts: Number(row.provider_timeouts ?? 0) };
    } catch {
      return NextResponse.json({ error: 'metrics_unavailable' }, { status: 503 });
    }
  }
  const averageDuration = snapshot.durationsSeconds.length === 0 ? 0 : snapshot.durationsSeconds.reduce((sum, value) => sum + value, 0) / snapshot.durationsSeconds.length;
  const values = [snapshot.queueDepth, snapshot.oldestJobAgeSeconds, snapshot.attempts, averageDuration, snapshot.workerErrors, snapshot.deadLetters, snapshot.sessionConflicts, snapshot.providerTimeouts];
  const dbAlerts = process.env.WORKBRIDGE_PERSISTENCE === 'memory' ? evaluateChatAlerts() : persistedAlerts;
  return NextResponse.json({ metrics: values.map((value, index) => ({ name: CHAT_METRIC_NAMES[index], labels: { service: 'chat' }, value })), alerts: dbAlerts });
}
