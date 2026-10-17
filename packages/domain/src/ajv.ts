import Ajv2020 from "ajv/dist/2020";
import type { ErrorObject, ValidateFunction } from "ajv";
import addFormats from "ajv-formats";
import agentEnvelopeSchema from "./schemas/agent-envelope.schema.json";
import jobRequirementsSchema from "./schemas/job-requirements.schema.json";
import workflowRunSchema from "./schemas/workflow-run.schema.json";
import commonSchema from "./schemas/common.schema.json";
import candidatePreferencesSchema from "./schemas/candidate-preferences.schema.json";
import type { AgentEnvelope, JobRequirements, WorkflowRunRequest } from "./types";

/** Ajv 2020-12 error shape (draft-07's legacy `dataPath` is not used here). */
export type AjvError = ErrorObject<string, Record<string, unknown>, unknown>;


export const SCHEMA_ID = jobRequirementsSchema.$id;
export const SCHEMA_VERSION = "1.0.0";

/**
 * Single Ajv 2020-12 instance for every JSON Schema contract in the repo.
 * `strict` is on so accidental schema drift fails loudly instead of being
 * silently ignored.
 */
export const ajv = new Ajv2020({
  allErrors: true,
  strict: true,
  allowUnionTypes: true,
});

addFormats(ajv);
ajv.addSchema(commonSchema);
ajv.addSchema(candidatePreferencesSchema);

export const validateJobRequirements: ValidateFunction<JobRequirements> =
  ajv.compile<JobRequirements>(jobRequirementsSchema);

export class AjvValidationError extends Error {
  readonly errors: AjvError[] | null | undefined;

  constructor(contract: string, errors: AjvError[] | null | undefined) {
    super(
      `Invalid ${contract}: ${(errors ?? [])
        .map((error) => `${error.instancePath || "/"} ${error.message ?? "is invalid"}`)
        .join("; ")}`,
    );
    this.name = "AjvValidationError";
    this.errors = errors;
  }
}

export function assertJobRequirements(value: unknown): asserts value is JobRequirements {
  if (!validateJobRequirements(value)) {
    throw new AjvValidationError("JobRequirements", validateJobRequirements.errors);
  }
}

export const AGENT_ENVELOPE_SCHEMA_ID = agentEnvelopeSchema.$id;
export const WORKFLOW_RUN_SCHEMA_ID = workflowRunSchema.$id;

export const validateAgentEnvelope: ValidateFunction<AgentEnvelope> =
  ajv.compile<AgentEnvelope>(agentEnvelopeSchema);

export const validateWorkflowRun: ValidateFunction<WorkflowRunRequest> =
  ajv.compile<WorkflowRunRequest>(workflowRunSchema);

export function assertAgentEnvelope(value: unknown): asserts value is AgentEnvelope {
  if (!validateAgentEnvelope(value)) {
    throw new AjvValidationError("AgentEnvelope", validateAgentEnvelope.errors);
  }
}

export function assertWorkflowRun(value: unknown): asserts value is WorkflowRunRequest {
  if (!validateWorkflowRun(value)) {
    throw new AjvValidationError("WorkflowRunRequest", validateWorkflowRun.errors);
  }
}
