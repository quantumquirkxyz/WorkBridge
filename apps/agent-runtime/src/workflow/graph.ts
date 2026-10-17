import { createStep, createWorkflow } from "@mastra/core/workflows";
import {
  assertWorkflowRun,
  type AgentEnvelope,
  type AgentId,
  type WorkflowRunRequest,
} from "@puente/domain";
import { runAgent, type WorkflowServices, type WorkflowStreamEvent } from "./agents";
import { assertCarrier, carrierSchema, type Carrier } from "./carrier";
import type { GuardrailDecision } from "./guardrails";
import {
  createMatchingService,
  matchingConfigFromEnv,
  type MatchingEnv,
  type MatchingService,
} from "../matching";
import { CAPABILITY_CHAINS, ModelRouter, type ModelInvoke } from "./models";
import { createExplorationAgent } from "../exploration/exploration-agent";
import { createSeedCatalog } from "@puente/catalog";
import { createProfileAgent } from "../profile-agent";
import {
  AppendOnlyAuditLog,
  DqlStore,
  LangfuseRecorder,
  type LangfuseClient,
} from "./observability";

export const WORKFLOW_ID = "puente-employability";

const AGENT_ORDER = [
  "exploration",
  "profile_and_evidence",
  "market_and_matching",
  "training",
] as const satisfies readonly AgentId[];

export interface WorkflowResult {
  trace_id: string;
  idempotency_key: string;
  status: "success" | "rejected" | "dead_letter";
  idempotentReplay: boolean;
  findings: GuardrailDecision[];
  agents: Array<{ agent: AgentId; summary: string }>;
  modelFallbacks: Array<{ capability: string; from: string; to: string }>;
  envelopes: AgentEnvelope[];
  mastraSteps: string[];
}

export interface WorkflowDependencies {
  complete: ModelInvoke;
  catalog?: readonly string[];
  clock?: () => string;
  langfuse?: LangfuseClient;
  /** Matching service used when the caller supplies validated matching input. */
  matching?: MatchingService;
  matchingEnv?: MatchingEnv;
}

export interface WorkflowRunOptions {
  onEvent?: (event: WorkflowStreamEvent) => void;
}

function toCarrier(input: WorkflowRunRequest): Carrier {
  return {
    traceId: input.trace_id,
    idempotencyKey: input.idempotency_key,
    candidateText: input.candidateText,
    vacancyText: input.vacancyText,
    declaredCredentials: input.declaredCredentials.map((credential) => ({ ...credential })),
    actorId: input.actor.id,
    actorRole: input.actor.role,
    requestedTools: [...input.requestedTools],
    ...(input.preferences ? { preferences: input.preferences } : {}),
    ...(input.matchingInput ? { matchingInput: input.matchingInput } : {}),
    halted: false,
    status: "running",
    findings: [],
    summaries: [],
    modelFallbacks: [],
  };
}

export class WorkflowRuntime {
  readonly audit = new AppendOnlyAuditLog();
  readonly dql = new DqlStore();
  readonly traces = new LangfuseRecorder();
  lastIngestion: ReturnType<LangfuseRecorder["flush"]> | null = null;
  private readonly router: ModelRouter;
  private readonly clock: () => string;
  private readonly langfuse?: LangfuseClient;
  private readonly matching?: MatchingService;
  private readonly active = new Map<string, WorkflowServices>();
  private readonly cache = new Map<string, WorkflowResult>();
  private readonly workflow: ReturnType<WorkflowRuntime["build"]>;

  constructor(deps: WorkflowDependencies) {
    this.clock = deps.clock ?? (() => new Date().toISOString());
    this.langfuse = deps.langfuse;
    this.matching = deps.matching ?? createMatchingService(
      matchingConfigFromEnv(deps.matchingEnv ?? (process.env as MatchingEnv)),
    );
    this.router = new ModelRouter(CAPABILITY_CHAINS, deps.complete);
    if (deps.catalog) this.router.preflight(deps.catalog);
    this.workflow = this.build();
  }

  private build() {
    const steps = AGENT_ORDER.map((agent) =>
      createStep({
        id: agent,
        description: `Puente ${agent} agent`,
        inputSchema: carrierSchema,
        outputSchema: carrierSchema,
        execute: async ({ inputData }) => {
          const services = this.active.get(inputData.traceId);
          if (!services) {
            throw new Error(`No workflow services registered for trace ${inputData.traceId}`);
          }
          return runAgent(agent, inputData, services);
        },
      }),
    );
    const [exploration, profile, market, training] = steps;
    if (!exploration || !profile || !market || !training) {
      throw new Error("Mastra workflow is missing an agent step");
    }
    return createWorkflow({
      id: WORKFLOW_ID,
      description: "Coordinates Exploration, Profile and Evidence, Market and Matching, and Training.",
      inputSchema: carrierSchema,
      outputSchema: carrierSchema,
      options: { shouldPersistSnapshot: () => false },
    })
      .then(exploration)
      .then(profile)
      .then(market)
      .then(training)
      .commit();
  }

  async run(input: WorkflowRunRequest, options: WorkflowRunOptions = {}): Promise<WorkflowResult> {
    assertWorkflowRun(input);
    const cached = this.cache.get(input.idempotency_key);
    if (cached) {
      for (const envelope of cached.envelopes) {
        options.onEvent?.({ event: "envelope", data: envelope });
      }
      return { ...cached, idempotentReplay: true };
    }

    const services: WorkflowServices = {
      audit: this.audit,
      dql: this.dql,
      traces: this.traces,
      router: this.router,
      ...(this.matching ? { matching: this.matching } : {}),
      clock: this.clock,
      envelopes: [],
      emit: options.onEvent,
      explorationAgent: createExplorationAgent({ catalog: createSeedCatalog(), now: () => new Date(this.clock()) }),
      profileAgent: createProfileAgent({ now: () => new Date(this.clock()) }),
    };
    this.active.set(input.trace_id, services);
    services.traces.startTrace({
      id: input.trace_id,
      name: WORKFLOW_ID,
      timestamp: this.clock(),
      metadata: {
        trace_id: input.trace_id,
        idempotency_key: input.idempotency_key,
        actor: input.actor.id,
        role: input.actor.role,
      },
    });

    try {
      const mastraRun = await this.workflow.createRun({
        runId: input.trace_id,
        shouldPersistSnapshot: () => false,
      });
      const started = await mastraRun.start({ inputData: toCarrier(input) });
      if (started.status !== "success") {
        const message = started.status === "failed" ? started.error.message : started.status;
        throw new Error(`Mastra workflow ${started.status}: ${message}`);
      }
      assertCarrier(started.result);
      const carrier = started.result;
      if (carrier.status === "running") {
        throw new Error("Mastra workflow finished without a terminal status");
      }
      const result: WorkflowResult = {
        trace_id: input.trace_id,
        idempotency_key: input.idempotency_key,
        status: carrier.status,
        idempotentReplay: false,
        findings: carrier.findings,
        agents: carrier.summaries,
        modelFallbacks: carrier.modelFallbacks,
        envelopes: [...services.envelopes],
        mastraSteps: AGENT_ORDER.filter((agent) => agent in started.steps),
      };
      this.lastIngestion = this.traces.flush();
      if (this.langfuse) await this.langfuse.ingest(this.lastIngestion);
      this.cache.set(input.idempotency_key, result);
      return result;
    } finally {
      this.active.delete(input.trace_id);
    }
  }
}

export function createWorkflowRuntime(deps: WorkflowDependencies): WorkflowRuntime {
  return new WorkflowRuntime(deps);
}
