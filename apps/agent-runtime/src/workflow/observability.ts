import type { AgentId, ActorRole } from "@workbridge/domain";

export type DqlState =
  | "pending"
  | "success"
  | "failed"
  | "rejected"
  | "retrying"
  | "dead_letter";

export interface AuditEvent {
  sequence: number;
  trace_id: string;
  timestamp: string;
  actor: string;
  role: ActorRole;
  agent: AgentId | "runtime";
  tool: string | null;
  evidence: string | null;
  constraint: string | null;
  modelFallback: string | null;
  action: string;
}

export type AuditDraft = Omit<AuditEvent, "sequence">;

const TRANSITIONS: Record<DqlState, readonly DqlState[]> = {
  pending: ["success", "failed", "rejected", "retrying"],
  failed: ["retrying", "dead_letter"],
  retrying: ["success", "failed", "dead_letter"],
  success: [],
  rejected: [],
  dead_letter: [],
};

export interface DqlHistoryEntry {
  state: DqlState;
  reason: string;
  at: string;
}

export interface DqlRecord {
  id: string;
  traceId: string;
  state: DqlState;
  history: readonly DqlHistoryEntry[];
}

export class InvalidDqlTransitionError extends Error {
  constructor(id: string, from: DqlState, to: DqlState) {
    super(`DQL ${id} cannot move from ${from} to ${to}`);
    this.name = "InvalidDqlTransitionError";
  }
}

export class AppendOnlyAuditLog {
  private readonly events: AuditEvent[] = [];

  append(draft: AuditDraft): AuditEvent {
    const stored = Object.freeze({ ...draft, sequence: this.events.length + 1 });
    this.events.push(stored);
    return stored;
  }

  read(): readonly AuditEvent[] {
    return this.events;
  }
}

export class DqlStore {
  private readonly records = new Map<string, { id: string; traceId: string; state: DqlState; history: DqlHistoryEntry[] }>();

  enqueue(id: string, traceId: string, at: string, reason = "accepted"): DqlRecord {
    if (this.records.has(id)) {
      throw new Error(`DQL event ${id} already exists`);
    }
    const record = {
      id,
      traceId,
      state: "pending" as const,
      history: [{ state: "pending" as const, reason, at }],
    };
    this.records.set(id, record);
    return this.snapshot(record);
  }

  transition(id: string, next: DqlState, reason: string, at: string): DqlRecord {
    const record = this.records.get(id);
    if (!record) throw new Error(`DQL event ${id} does not exist`);
    if (!TRANSITIONS[record.state].includes(next)) {
      throw new InvalidDqlTransitionError(id, record.state, next);
    }
    record.state = next;
    record.history.push({ state: next, reason, at });
    return this.snapshot(record);
  }

  list(traceId?: string): DqlRecord[] {
    const records = [...this.records.values()];
    const selected = traceId ? records.filter((record) => record.traceId === traceId) : records;
    return selected.map((record) => this.snapshot(record));
  }

  private snapshot(record: {
    id: string;
    traceId: string;
    state: DqlState;
    history: DqlHistoryEntry[];
  }): DqlRecord {
    return {
      id: record.id,
      traceId: record.traceId,
      state: record.state,
      history: record.history.map((entry) => ({ ...entry })),
    };
  }
}

export interface LangfuseSpan {
  id: string;
  traceId: string;
  name: string;
  startTime: string;
  endTime?: string;
  input?: unknown;
  output?: unknown;
  metadata: Record<string, unknown>;
  level: "DEFAULT" | "WARNING" | "ERROR";
}

export interface LangfuseTrace {
  id: string;
  name: string;
  timestamp: string;
  metadata: Record<string, unknown>;
}

export class LangfuseRecorder {
  private readonly traces = new Map<string, LangfuseTrace>();
  private readonly spans: LangfuseSpan[] = [];

  startTrace(trace: LangfuseTrace): void {
    this.traces.set(trace.id, trace);
  }

  startSpan(span: Omit<LangfuseSpan, "level"> & { level?: LangfuseSpan["level"] }): LangfuseSpan {
    const stored: LangfuseSpan = { ...span, level: span.level ?? "DEFAULT", metadata: { ...span.metadata, trace_id: span.traceId } };
    this.spans.push(stored);
    return stored;
  }

  endSpan(
    spanId: string,
    update: { output?: unknown; level?: LangfuseSpan["level"]; metadata?: Record<string, unknown>; endTime: string },
  ): LangfuseSpan {
    const span = this.spans.find((item) => item.id === spanId);
    if (!span) throw new Error(`Langfuse span ${spanId} does not exist`);
    span.endTime = update.endTime;
    span.output = update.output;
    if (update.level) span.level = update.level;
    if (update.metadata) span.metadata = { ...span.metadata, ...update.metadata, trace_id: span.traceId };
    return span;
  }

  tracesFor(traceId: string): { trace: LangfuseTrace | undefined; spans: LangfuseSpan[] } {
    return {
      trace: this.traces.get(traceId),
      spans: this.spans.filter((span) => span.traceId === traceId),
    };
  }

  /** Langfuse ingestion batch. The in-memory recorder is the sink used in tests and local runs. */
  private flushed: ReturnType<LangfuseRecorder["toIngestionBatch"]> | null = null;

  /** Build the ingestion batch and keep it so a run can prove the flush happened. */
  flush(traceId?: string): ReturnType<LangfuseRecorder["toIngestionBatch"]> {
    this.flushed = this.toIngestionBatch(traceId);
    return this.flushed;
  }

  lastBatch(): ReturnType<LangfuseRecorder["toIngestionBatch"]> | null {
    return this.flushed;
  }

  toIngestionBatch(traceId?: string): {
    batch: Array<{ id: string; type: "trace-create" | "span-create"; timestamp: string; body: unknown }>;
  } {
    const batch: Array<{ id: string; type: "trace-create" | "span-create"; timestamp: string; body: unknown }> = [];
    for (const trace of this.traces.values()) {
      if (traceId !== undefined && trace.id !== traceId) continue;
      batch.push({
        id: trace.id,
        type: "trace-create",
        timestamp: trace.timestamp,
        body: trace,
      });
    }
    for (const span of this.spans) {
      if (traceId !== undefined && span.traceId !== traceId) continue;
      batch.push({
        id: span.id,
        type: "span-create",
        timestamp: span.startTime,
        body: span,
      });
    }
    return { batch };
  }
}

export interface LangfuseIngestionBatch {
  batch: Array<{ id: string; type: string; timestamp: string; body: unknown }>;
}

export interface LangfuseClient {
  ingest(batch: LangfuseIngestionBatch): Promise<void>;
}

export interface LangfuseEnv {
  LANGFUSE_PUBLIC_KEY?: string;
  LANGFUSE_SECRET_KEY?: string;
  LANGFUSE_BASE_URL?: string;
}

/** Returns a client only when both keys are set. Empty keys stay offline. */
export function langfuseClientFromEnv(
  env: LangfuseEnv,
  fetchImpl: typeof fetch = globalThis.fetch,
): LangfuseClient | undefined {
  const publicKey = env.LANGFUSE_PUBLIC_KEY?.trim() ?? "";
  const secretKey = env.LANGFUSE_SECRET_KEY?.trim() ?? "";
  if (publicKey.length === 0 || secretKey.length === 0) return undefined;
  const baseUrl = env.LANGFUSE_BASE_URL?.trim().replace(/\/+$/, "");
  return createLangfuseClient({
    publicKey,
    secretKey,
    fetchImpl,
    ...(baseUrl ? { baseUrl } : {}),
  });
}

/** Posts a batch to Langfuse's public ingestion API. Tests inject fetch. */
export function createLangfuseClient(options: {
  publicKey: string;
  secretKey?: string;
  fetchImpl: typeof fetch;
  baseUrl?: string;
}): LangfuseClient {
  const baseUrl = options.baseUrl ?? "https://cloud.langfuse.com";
  const token = Buffer.from(`${options.publicKey}:${options.secretKey ?? ""}`).toString("base64");
  return {
    async ingest(batch) {
      const response = await options.fetchImpl(`${baseUrl}/api/public/ingestion`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(batch),
        signal: AbortSignal.timeout(5_000),
      });
      if (!response.ok) {
        throw new Error(`Langfuse ingestion failed: ${response.status}`);
      }
    },
  };
}
