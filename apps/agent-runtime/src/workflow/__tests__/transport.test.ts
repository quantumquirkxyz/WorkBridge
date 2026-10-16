import { describe, expect, it } from "vitest";
import type { WorkflowRunRequest } from "@puente/domain";
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
    const body = JSON.parse(response.body) as { status: string; trace_id: string };
    expect(body.status).toBe("success");
    expect(body.trace_id).toBe("trace-0099");
  });

  it("streams SSE envelopes, lifecycle, and the trace", async () => {
    const response = await handleWorkflowRequest(runtime(), {
      method: "POST",
      path: "/internal/workflow/runs",
      headers: { Accept: "text/event-stream" },
      body: request(),
    });
    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toBe("text/event-stream");
    expect(response.body).toContain("event: envelope");
    expect(response.body).toContain("event: lifecycle");
    expect(response.body).toContain("event: trace");
    expect(response.body).toContain("trace-0099");
    expect(response.body).toContain("idem-0099");
  });

  it("maps a missing trace_id to invalid_schema", async () => {
    const { trace_id: _ignored, ...body } = request();
    const response = await handleWorkflowRequest(runtime(), {
      method: "POST",
      path: "/internal/workflow/runs",
      body,
    });
    expect(response.status).toBe(400);
    expect(JSON.parse(response.body)).toMatchObject({ code: "invalid_schema" });
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
