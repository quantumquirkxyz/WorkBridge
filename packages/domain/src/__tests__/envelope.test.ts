import { describe, expect, it } from "vitest";
import {
  assertAgentEnvelope,
  assertWorkflowRun,
  validateAgentEnvelope,
  validateWorkflowRun,
  type AgentEnvelope,
  type WorkflowRunRequest,
} from "@puente/domain";

function envelope(): AgentEnvelope {
  return {
    trace_id: "trace-0001",
    idempotency_key: "idem-0001",
    agent: "exploration",
    kind: "request",
    payload: { note: "hola" },
  };
}

function runRequest(): WorkflowRunRequest {
  return {
    trace_id: "trace-0001",
    idempotency_key: "idem-0001",
    candidateText: "Experiencia en caja en el negocio familiar.",
    vacancyText: "Se busca cajero con atención al cliente.",
    declaredCredentials: [{ id: "cred-1", name: "Manipulación de alimentos" }],
    actor: { id: "cand-1", role: "candidate" },
    requestedTools: [],
  };
}

describe("AgentEnvelope schema", () => {
  it("requires trace_id and idempotency_key", () => {
    expect(validateAgentEnvelope(envelope())).toBe(true);
    expect(() => assertAgentEnvelope(envelope())).not.toThrow();
  });

  it("rejects a missing trace_id", () => {
    const { trace_id: _traceId, ...rest } = envelope();
    expect(validateAgentEnvelope(rest)).toBe(false);
    expect(() => assertAgentEnvelope(rest)).toThrow(/trace_id/);
  });

  it("rejects a missing idempotency_key", () => {
    const { idempotency_key: _key, ...rest } = envelope();
    expect(validateAgentEnvelope(rest)).toBe(false);
    expect(() => assertAgentEnvelope(rest)).toThrow(/idempotency_key/);
  });

  it("rejects an unknown agent", () => {
    expect(validateAgentEnvelope({ ...envelope(), agent: "recruiter" })).toBe(false);
  });
});

describe("WorkflowRunRequest schema", () => {
  it("accepts a run that names both correlation fields", () => {
    expect(validateWorkflowRun(runRequest())).toBe(true);
    expect(() => assertWorkflowRun(runRequest())).not.toThrow();
  });

  it("rejects unexpected properties", () => {
    expect(validateWorkflowRun({ ...runRequest(), extra: true })).toBe(false);
  });

  it("rejects a short trace_id", () => {
    expect(validateWorkflowRun({ ...runRequest(), trace_id: "short" })).toBe(false);
  });
});
