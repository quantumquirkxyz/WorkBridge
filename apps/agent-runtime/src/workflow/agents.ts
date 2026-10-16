import { assertAgentEnvelope, type AgentEnvelope, type AgentId } from "@puente/domain";
import type { Carrier } from "./carrier";
import {
  DEFAULT_AGENT_TOOL,
  redactPii,
  screenInput,
  screenOutput,
  screenPermission,
  screenRequestedTool,
  screenToolResult,
  type GuardrailDecision,
} from "./guardrails";
import {
  AGENT_CAPABILITIES,
  BudgetExceededError,
  ModelChainExhaustedError,
  estimateTokens,
  type ModelRouter,
} from "./models";
import type { AppendOnlyAuditLog, DqlRecord, DqlStore, LangfuseRecorder } from "./observability";

export interface WorkflowStreamEvent {
  event: "envelope" | "lifecycle" | "trace";
  data: unknown;
}

export interface WorkflowServices {
  audit: AppendOnlyAuditLog;
  dql: DqlStore;
  traces: LangfuseRecorder;
  router: ModelRouter;
  clock: () => string;
  envelopes: AgentEnvelope[];
  emit?: (event: WorkflowStreamEvent) => void;
}

function publish(
  services: WorkflowServices,
  carrier: Carrier,
  agent: AgentId,
  kind: "request" | "response" | "event",
  payload: Record<string, unknown>,
): void {
  const envelope: AgentEnvelope = {
    trace_id: carrier.traceId,
    idempotency_key: carrier.idempotencyKey,
    agent,
    kind,
    payload,
  };
  assertAgentEnvelope(envelope);
  services.envelopes.push(envelope);
  services.emit?.({ event: "envelope", data: envelope });
}

function move(
  services: WorkflowServices,
  id: string,
  next: DqlRecord["state"],
  reason: string,
): DqlRecord {
  const record = services.dql.transition(id, next, reason, services.clock());
  services.emit?.({ event: "lifecycle", data: record });
  return record;
}

function audit(
  services: WorkflowServices,
  carrier: Carrier,
  agent: AgentId,
  action: string,
  fields: {
    tool?: string | null;
    evidence?: string | null;
    constraint?: string | null;
    modelFallback?: string | null;
  } = {},
): void {
  services.audit.append({
    trace_id: carrier.traceId,
    timestamp: services.clock(),
    actor: carrier.actorId,
    role: carrier.actorRole,
    agent,
    tool: fields.tool ?? null,
    evidence: fields.evidence ?? null,
    constraint: fields.constraint ?? null,
    modelFallback: fields.modelFallback ?? null,
    action,
  });
}

function promptFor(agent: AgentId, carrier: Carrier): string {
  return [
    `Agent ${agent}.`,
    `CV: ${redactPii(carrier.candidateText).slice(0, 400)}`,
    `Vacancy: ${redactPii(carrier.vacancyText).slice(0, 400)}`,
    "Reply with a short employability note and no contact details.",
  ].join(" ");
}

function reject(
  carrier: Carrier,
  services: WorkflowServices,
  agent: AgentId,
  spanId: string,
  dqlId: string,
  findings: GuardrailDecision[],
): Carrier {
  for (const finding of findings) {
    audit(services, carrier, agent, "guardrail_block", {
      tool: finding.stage === "permission" || finding.stage === "tool_result" ? finding.source : null,
      evidence: finding.source,
      constraint: finding.code,
    });
  }
  const primary = findings[0];
  move(services, dqlId, "rejected", primary?.reason ?? "guardrail rejected the step");
  const span = services.traces.endSpan(spanId, {
    endTime: services.clock(),
    level: "ERROR",
    output: findings,
  });
  services.emit?.({ event: "trace", data: span });
  publish(services, carrier, agent, "event", {
    status: "rejected",
    findings,
  });
  return {
    ...carrier,
    halted: true,
    status: "rejected",
    findings: [...carrier.findings, ...findings],
  };
}

export async function runAgent(
  agent: AgentId,
  carrier: Carrier,
  services: WorkflowServices,
): Promise<Carrier> {
  if (carrier.halted) return carrier;

  const tool = DEFAULT_AGENT_TOOL[agent];
  const startedAt = services.clock();
  const span = services.traces.startSpan({
    id: `${carrier.traceId}:${agent}`,
    traceId: carrier.traceId,
    name: agent,
    startTime: startedAt,
    input: { agent },
    metadata: {
      agent,
      trace_id: carrier.traceId,
      actor: carrier.actorId,
      role: carrier.actorRole,
      tool,
      evidence: null,
      constraint: null,
    },
  });
  const dqlId = `${carrier.traceId}:${agent}`;
  const pending = services.dql.enqueue(dqlId, carrier.traceId, startedAt, `${agent} started`);
  services.emit?.({ event: "lifecycle", data: pending });
  publish(services, carrier, agent, "request", { tool, capability: AGENT_CAPABILITIES[agent] });

  if (agent === "exploration") {
    const findings = [
      ...carrier.requestedTools.map((requested) => screenRequestedTool(requested, carrier.actorRole)),
      screenInput(carrier.candidateText, "candidate"),
      screenInput(carrier.vacancyText, "vacancy"),
    ].filter((decision) => !decision.allowed);
    if (findings.length > 0) {
      return reject(carrier, services, agent, span.id, dqlId, findings);
    }
  }

  const permission = screenPermission({
    tool,
    agent,
    role: carrier.actorRole,
    source: tool,
  });
  if (!permission.allowed) {
    return reject(carrier, services, agent, span.id, dqlId, [permission]);
  }

  const prompt = promptFor(agent, carrier);
  try {
    const completion = await services.router.complete({
      capability: AGENT_CAPABILITIES[agent],
      prompt,
      estimatedTokens: estimateTokens(prompt),
    });
    const toolDecision = screenToolResult({
      tool,
      agent,
      role: carrier.actorRole,
      body: completion.text,
      declaredCredentials: carrier.declaredCredentials,
    });
    if (!toolDecision.allowed) {
      return reject(carrier, services, agent, span.id, dqlId, [toolDecision]);
    }
    const outputDecision = screenOutput({
      text: completion.text,
      declaredCredentials: carrier.declaredCredentials,
      source: agent,
    });
    if (!outputDecision.allowed) {
      return reject(carrier, services, agent, span.id, dqlId, [outputDecision]);
    }

    if (completion.fallbacks.length > 0) {
      move(services, dqlId, "retrying", "primary model failed");
      for (const hop of completion.fallbacks) {
        audit(services, carrier, agent, "model_fallback", {
          tool,
          modelFallback: `${hop.from} -> ${hop.to}`,
          constraint: "model_fallback",
          evidence: hop.to,
        });
      }
    }

    move(services, dqlId, "success", `${agent} completed`);
    audit(services, carrier, agent, "agent_completed", {
      tool,
      evidence: completion.text.slice(0, 120),
      constraint: null,
    });
    const closed = services.traces.endSpan(span.id, {
      endTime: services.clock(),
      output: completion.text,
      metadata: {
        modelId: completion.modelId,
        fallbacks: completion.fallbacks,
        evidence: completion.text.slice(0, 120),
      },
    });
    services.emit?.({ event: "trace", data: closed });
    publish(services, carrier, agent, "response", {
      summary: completion.text,
      modelId: completion.modelId,
    });
    return {
      ...carrier,
      summaries: [...carrier.summaries, { agent, summary: completion.text }],
      modelFallbacks: [
        ...carrier.modelFallbacks,
        ...completion.fallbacks.map((hop) => ({
          capability: completion.capability,
          from: hop.from,
          to: hop.to,
        })),
      ],
      status: agent === "training" ? "success" : carrier.status,
    };
  } catch (error) {
    if (error instanceof ModelChainExhaustedError || error instanceof BudgetExceededError) {
      const message = error.message;
      const attempted = error instanceof ModelChainExhaustedError ? error.attempted : [];
      move(services, dqlId, "failed", attempted[0] ? `${attempted[0]} failed: ${message}` : message);
      for (const modelId of attempted.slice(1)) {
        move(services, dqlId, "retrying", `called ${modelId}`);
        move(services, dqlId, "failed", `${modelId} failed: ${message}`);
      }
      move(services, dqlId, "dead_letter", message);
      audit(services, carrier, agent, "model_dead_letter", {
        tool,
        constraint: error.code,
        evidence: attempted.length > 0 ? attempted.join(",") : null,
      });
      const closed = services.traces.endSpan(span.id, {
        endTime: services.clock(),
        level: "ERROR",
        output: { message },
      });
      services.emit?.({ event: "trace", data: closed });
      publish(services, carrier, agent, "event", { status: "dead_letter", message });
      return { ...carrier, halted: true, status: "dead_letter" };
    }
    throw error;
  }
}
