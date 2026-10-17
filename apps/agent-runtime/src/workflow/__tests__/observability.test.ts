import { describe, expect, it } from "vitest";
import {
  AppendOnlyAuditLog,
  DqlStore,
  InvalidDqlTransitionError,
  LangfuseRecorder,
  createLangfuseClient,
} from "../observability";

const at = "2026-10-16T12:00:00.000Z";

describe("AppendOnlyAuditLog", () => {
  it("assigns sequence numbers and freezes stored events", () => {
    const log = new AppendOnlyAuditLog();
    const draft = {
      trace_id: "trace-0001",
      timestamp: at,
      actor: "cand-1",
      role: "candidate" as const,
      agent: "exploration" as const,
      tool: null,
      evidence: "candidate",
      constraint: "prompt_injection",
      modelFallback: null,
      action: "guardrail_block",
    };
    log.append(draft);
    log.append({ ...draft, action: "model_fallback", modelFallback: "a -> b" });
    expect(log.read().map((event) => event.sequence)).toEqual([1, 2]);
    expect(Object.isFrozen(log.read()[0])).toBe(true);
    expect(log.read()[0]?.action).toBe("guardrail_block");
  });
});

describe("DqlStore", () => {
  it("walks pending, failed, retrying, and dead_letter", () => {
    const store = new DqlStore();
    store.enqueue("trace-0001:exploration", "trace-0001", at);
    store.transition("trace-0001:exploration", "failed", "provider down", at);
    store.transition("trace-0001:exploration", "retrying", "fallback", at);
    const final = store.transition("trace-0001:exploration", "dead_letter", "chain exhausted", at);
    expect(final.history.map((entry) => entry.state)).toEqual([
      "pending",
      "failed",
      "retrying",
      "dead_letter",
    ]);
  });

  it("rejects a transition out of a terminal state", () => {
    const store = new DqlStore();
    store.enqueue("evt-1", "trace-0001", at);
    store.transition("evt-1", "rejected", "injection", at);
    expect(() => store.transition("evt-1", "success", "nope", at)).toThrow(InvalidDqlTransitionError);
  });
});

describe("LangfuseRecorder", () => {
  it("emits an ingestion batch that keeps trace_id on every span", () => {
    const recorder = new LangfuseRecorder();
    recorder.startTrace({
      id: "trace-0001",
      name: "workbridge-employability",
      timestamp: at,
      metadata: { trace_id: "trace-0001" },
    });
    const span = recorder.startSpan({
      id: "trace-0001:exploration",
      traceId: "trace-0001",
      name: "exploration",
      startTime: at,
      metadata: { agent: "exploration" },
    });
    recorder.endSpan(span.id, { endTime: at, output: { status: "success" } });
    const batch = recorder.toIngestionBatch();
    expect(batch.batch.map((item) => item.type)).toEqual(["trace-create", "span-create"]);
    const spanBody = batch.batch[1]?.body as { metadata: { trace_id: string } };
    expect(spanBody.metadata.trace_id).toBe("trace-0001");
    expect(recorder.flush().batch).toHaveLength(2);
    expect(recorder.lastBatch()?.batch).toHaveLength(2);
  });
});

describe("createLangfuseClient", () => {
  it("posts the ingestion batch when fetch is injected", async () => {
    let posted = "";
    const client = createLangfuseClient({
      publicKey: "pk-test",
      secretKey: "sk-test",
      baseUrl: "https://langfuse.test",
      fetchImpl: async (_input, init) => {
        posted = String(init?.body);
        return new Response("ok", { status: 200 });
      },
    });
    await client.ingest({
      batch: [{ id: "trace-0001", type: "trace-create", timestamp: at, body: { id: "trace-0001" } }],
    });
    expect(posted).toContain("trace-0001");
  });
});
