import { assertAgentEnvelope, type AgentEnvelope, type AgentId } from "@puente/domain";
import type { Carrier } from "./carrier";
import {
  DEFAULT_AGENT_TOOL,
  redactPii,
  screenInput,
  screenOutput,
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
import type { AppendOnlyAuditLog, DqlStore, LangfuseRecorder } from "./observability";

export interface WorkflowServices {
  audit: AppendOnlyAuditLog;
  dql: DqlStore;
  traces: LangfuseRecorder;
  router: ModelRouter;
  clock: () => string;
  envelopes: AgentEnvelope[];
}

function publish(
  services: WorkflowServices,
  carrier: Carrier,
  agent: AgentId,
  kind: "response" | "event",
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

function toolBody(agent: AgentId, carrier: Carrier): string {
  switch (agent) {
    case "exploration":
      return redactPii(carrier.candidateText);
    case "profile_and_evidence":
      return carrier.declaredCredentials.map((credential) => credential.name).join(", ") || "none";
    case "market_and_matching":
      return redactPii(carrier.vacancyText);
    case "training":
      return "suggest a short practice plan";
    default: {
      const unknown: never = agent;
      return unknown;
    }
  }
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
  services.dql.transition(
    dqlId,
    "rejected",
    primary?.reason ?? "guardrail rejected the step",
    services.clock(),
  );
  services.traces.endSpan(spanId, {
    endTime: services.clock(),
    level: "ERROR",
    output: findings,
  });
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

  const startedAt = services.clock();
  const span = services.traces.startSpan({
    id: `${carrier.traceId}:${agent}`,
    traceId: carrier.traceId,
    name: agent,
    startTime: startedAt,
    input: { agent },
    metadata: { agent, trace_id: carrier.traceId },
  });
  const dqlId = `${carrier.traceId}:${agent}`;
  services.dql.enqueue(dqlId, carrier.traceId, startedAt, `${agent} started`);

  if (agent === "exploration") {
    const findings = [
      ...carrier.requestedTools.map((tool) => screenRequestedTool(tool, carrier.actorRole)),
      screenInput(carrier.candidateText, "candidate"),
      screenInput(carrier.vacancyText, "vacancy"),
    ].filter((decision) => !decision.allowed);
    if (findings.length > 0) {
      return reject(carrier, services, agent, span.id, dqlId, findings);
    }
  }

  const tool = DEFAULT_AGENT_TOOL[agent];
  const toolDecision = screenToolResult({
    tool,
    agent,
    role: carrier.actorRole,
    body: toolBody(agent, carrier),
    declaredCredentials: carrier.declaredCredentials,
  });
  if (!toolDecision.allowed) {
    return reject(carrier, services, agent, span.id, dqlId, [toolDecision]);
  }

  const prompt = promptFor(agent, carrier);
  try {
    const completion = await services.router.complete({
      capability: AGENT_CAPABILITIES[agent],
      prompt,
      estimatedTokens: estimateTokens(prompt),
    });
    const outputDecision = screenOutput({
      text: completion.text,
      declaredCredentials: carrier.declaredCredentials,
      source: agent,
    });
    if (!outputDecision.allowed) {
      return reject(carrier, services, agent, span.id, dqlId, [outputDecision]);
    }

    if (completion.fallbacks.length > 0) {
      services.dql.transition(dqlId, "retrying", "primary model failed", services.clock());
      for (const hop of completion.fallbacks) {
        audit(services, carrier, agent, "model_fallback", {
          tool,
          modelFallback: `${hop.from} -> ${hop.to}`,
          constraint: "model_fallback",
        });
      }
    }

    services.dql.transition(dqlId, "success", `${agent} completed`, services.clock());
    services.traces.endSpan(span.id, {
      endTime: services.clock(),
      output: completion.text,
      metadata: {
        modelId: completion.modelId,
        fallbacks: completion.fallbacks,
      },
    });
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
      services.dql.transition(dqlId, "failed", message, services.clock());
      services.dql.transition(dqlId, "retrying", "model chain retry", services.clock());
      services.dql.transition(dqlId, "dead_letter", message, services.clock());
      audit(services, carrier, agent, "model_dead_letter", {
        tool,
        constraint: error.code,
        evidence: error instanceof ModelChainExhaustedError ? error.attempted.join(",") : null,
      });
      services.traces.endSpan(span.id, {
        endTime: services.clock(),
        level: "ERROR",
        output: { message },
      });
      publish(services, carrier, agent, "event", { status: "dead_letter", message });
      return { ...carrier, halted: true, status: "dead_letter" };
    }
    throw error;
  }
}
