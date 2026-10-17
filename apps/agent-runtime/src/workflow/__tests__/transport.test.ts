import { describe, expect, it } from "vitest";
import type { WorkflowRunRequest } from "@workbridge/domain";
import { createWorkflowRuntime } from "../graph";
import { encodeSseEvent, handleWorkflowRequest } from "../transport";

function request(): WorkflowRunRequest {
  return {
    trace_id: "trace-0099",
    idempotency_key: "idem-0099",
    candidateText: "Experiencia en caja y atención al cliente.",
    vacancyText: "Se busca cajero con atención al cliente.",
    declaredCredentials: [],
    actor: { id: "cand-9", role: "candidate" },
    requestedTools: [],
  };
}

function runtime() {
  return createWorkflowRuntime({
    clock: () => "2026-10-16T12:00:00.000Z",
    complete: async () => ({ text: "Plan de practica en caja" }),
  });
}

describe("workflow transport", () => {
  it("returns JSON for a valid run", async () => {
    const response = await handleWorkflowRequest(runtime(), {
      method: "POST",
      path: "/internal/workflow/runs",
      headers: { accept: "application/json" },
      body: request(),
    });
    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toBe("application/json");
    expect(typeof response.body).toBe("string");
    const body = JSON.parse(response.body as string) as { status: string; trace_id: string };
    expect(body.status).toBe("success");
    expect(body.trace_id).toBe("trace-0099");
  });

  it("enqueues the request envelope before the model call returns", async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let calls = 0;
    const engine = createWorkflowRuntime({
      clock: () => "2026-10-16T12:00:00.000Z",
      complete: async () => {
        calls += 1;
        if (calls === 1) await gate;
        return { text: "Plan de practica en caja" };
      },
    });
    const response = await handleWorkflowRequest(engine, {
      method: "POST",
      path: "/internal/workflow/runs",
      headers: { Accept: "text/event-stream" },
      body: request(),
    });
    expect(response.body).toBeInstanceOf(ReadableStream);
    const reader = (response.body as ReadableStream<Uint8Array>).getReader();
    const decoder = new TextDecoder();
    let head = "";
    while (!head.includes('"kind":"request"')) {
      const chunk = await reader.read();
      expect(chunk.done).toBe(false);
      head += decoder.decode(chunk.value);
    }
    expect(head).toContain("event: envelope");
    expect(head).toContain("trace-0099");
    release();
    let rest = "";
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      rest += decoder.decode(chunk.value);
    }
    expect(rest).toContain("event: lifecycle");
    expect(rest).toContain("event: trace");
    expect(rest).toContain("event: result");
    expect(rest).toContain("idem-0099");
  });

  it("maps a missing trace_id to invalid_schema", async () => {
    const { trace_id: _ignored, ...body } = request();
    const response = await handleWorkflowRequest(runtime(), {
      method: "POST",
      path: "/internal/workflow/runs",
      body,
    });
    expect(response.status).toBe(400);
    expect(typeof response.body).toBe("string");
    expect(JSON.parse(response.body as string)).toMatchObject({ code: "invalid_schema" });
  });

  it("rejects the wrong method and path", async () => {
    const engine = runtime();
    const missing = await handleWorkflowRequest(engine, { method: "POST", path: "/elsewhere" });
    const method = await handleWorkflowRequest(engine, {
      method: "GET",
      path: "/internal/workflow/runs",
    });
    expect(missing.status).toBe(404);
    expect(method.status).toBe(405);
  });

  it("encodes one SSE event with a blank line terminator", () => {
    expect(encodeSseEvent("result", { ok: true })).toBe('event: result\ndata: {"ok":true}\n\n');
  });
});
