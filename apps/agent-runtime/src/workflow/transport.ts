import { AjvValidationError } from "@puente/domain";
import type { DqlRecord, LangfuseSpan } from "./observability";
import { createWorkflowRuntime, type WorkflowResult, type WorkflowRuntime } from "./graph";

export interface WorkflowHttpRequest {
  method: string;
  path: string;
  headers?: Record<string, string | undefined>;
  body?: unknown;
}

export interface WorkflowHttpResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
}

export function encodeSseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function header(headers: WorkflowHttpRequest["headers"], name: string): string {
  if (!headers) return "";
  const match = Object.entries(headers).find(([key]) => key.toLowerCase() === name);
  return match?.[1] ?? "";
}

function json(status: number, payload: unknown): WorkflowHttpResponse {
  return {
    status,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  };
}

export function encodeWorkflowSse(input: {
  result: WorkflowResult;
  lifecycle: readonly DqlRecord[];
  spans: readonly LangfuseSpan[];
}): string {
  const chunks = [
    ...input.result.envelopes.map((envelope) => encodeSseEvent("envelope", envelope)),
    ...input.lifecycle.map((record) => encodeSseEvent("lifecycle", record)),
    ...input.spans.map((span) => encodeSseEvent("trace", span)),
    encodeSseEvent("result", input.result),
  ];
  return chunks.join("");
}

export async function handleWorkflowRequest(
  runtime: WorkflowRuntime,
  request: WorkflowHttpRequest,
): Promise<WorkflowHttpResponse> {
  if (request.path !== "/internal/workflow/runs") {
    return json(404, { code: "not_found" });
  }
  if (request.method !== "POST") {
    return json(405, { code: "method_not_allowed" });
  }

  try {
    const result = await runtime.run(request.body as never);
    const lifecycle = runtime.dql.list(result.trace_id);
    const spans = runtime.traces.tracesFor(result.trace_id).spans;
    if (header(request.headers, "accept").includes("text/event-stream")) {
      return {
        status: 200,
        headers: { "content-type": "text/event-stream" },
        body: encodeWorkflowSse({ result, lifecycle, spans }),
      };
    }
    return json(200, result);
  } catch (error) {
    if (error instanceof AjvValidationError) {
      return json(400, { code: "invalid_schema", message: error.message });
    }
    throw error;
  }
}

export { createWorkflowRuntime };
