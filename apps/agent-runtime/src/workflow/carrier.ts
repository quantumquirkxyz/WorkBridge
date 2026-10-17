import { AjvValidationError, ajv, type ActorRole, type AgentId, type CandidatePreferences, type DeclaredCredentialClaim } from "@workbridge/domain";
import type { GuardrailDecision } from "./guardrails";
import type { CandidateNominationResult } from "../matching";
import type { Roadmap } from "@workbridge/training";
import carrierJsonSchema from "./carrier.schema.json";

export interface Carrier {
  traceId: string;
  idempotencyKey: string;
  candidateText: string;
  vacancyText: string;
  declaredCredentials: DeclaredCredentialClaim[];
  actorId: string;
  actorRole: ActorRole;
  requestedTools: string[];
  preferences?: CandidatePreferences;
  matchingInput?: unknown;
  /** Structured deterministic match result, populated by market_and_matching. */
  matchResult?: CandidateNominationResult;
  /** Structured training roadmap, populated by training. */
  roadmapResult?: Roadmap;
  halted: boolean;
  status: "running" | "success" | "rejected" | "dead_letter";
  findings: GuardrailDecision[];
  summaries: Array<{ agent: AgentId; summary: string }>;
  modelFallbacks: Array<{ capability: string; from: string; to: string }>;
}

const validateCarrier = ajv.compile<Carrier>(carrierJsonSchema);

export function assertCarrier(value: unknown): asserts value is Carrier {
  if (!validateCarrier(value)) {
    throw new AjvValidationError("WorkflowCarrier", validateCarrier.errors);
  }
}

function validateStandard(value: unknown): { value: Carrier } | { issues: Array<{ message: string }> } {
  if (validateCarrier(value)) return { value };
  return {
    issues: (validateCarrier.errors ?? []).map((error) => ({
      message: `${error.instancePath || "/"} ${error.message ?? "is invalid"}`,
    })),
  };
}

/**
 * Mastra step schema. Validation runs through the compiled Ajv 2020-12 function.
 */
export const carrierSchema = {
  "~standard": {
    version: 1 as const,
    vendor: "ajv",
    types: undefined as { input: Carrier; output: Carrier } | undefined,
    validate: validateStandard,
    jsonSchema: {
      input: () => carrierJsonSchema,
      output: () => carrierJsonSchema,
    },
  },
};
