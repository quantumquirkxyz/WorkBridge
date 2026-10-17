import { AjvValidationError, assertWorkflowRun } from "@puente/domain";
import { createWorkflowRuntime, type WorkflowRuntime } from "./graph";

export interface WorkflowHttpRequest {
  method: string;
  path: string;
  headers?: Record<string, string | undefined>;
  body?: unknown;
}

export interface WorkflowHttpResponse {
  status: number;
  headers: Record<string, string>;
  body: string | ReadableStream<Uint8Array>;
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
    assertWorkflowRun(request.body);
  } catch (error) {
    if (error instanceof AjvValidationError) {
      return json(400, { code: "invalid_schema", message: error.message });
    }
    throw error;
  }

  const body = request.body;
  if (header(request.headers, "accept").includes("text/event-stream")) {
    return {
      status: 200,
      headers: { "content-type": "text/event-stream" },
      body: new ReadableStream<Uint8Array>({
        async start(controller) {
          const encoder = new TextEncoder();
          try {
            const result = await runtime.run(body, {
              onEvent(event) {
                controller.enqueue(encoder.encode(encodeSseEvent(event.event, event.data)));
              },
            });
            controller.enqueue(encoder.encode(encodeSseEvent("result", result)));
            controller.close();
          } catch (error) {
            controller.error(error);
          }
        },
      }),
    };
  }

  try {
    return json(200, await runtime.run(body));
  } catch (error) {
    if (error instanceof AjvValidationError) {
      return json(400, { code: "invalid_schema", message: error.message });
    }
    throw error;
  }
}

export { createWorkflowRuntime };
