import type { ValidateFunction } from "ajv";
import auditEventSchema from "./schemas/audit-event.schema.json";
import matchDecisionSchema from "./schemas/match-decision.schema.json";
import workflowEnvelopeSchema from "./schemas/workflow-envelope.schema.json";
import { AjvValidationError, ajv } from "./ajv";

/**
 * Assumed contracts for issues #8 and #9.
 * The constants and validators are the executable signature. The solvers,
 * Mastra graph, and model guardrail runner are not implemented here.
 */

export const MATCH_DECISION_SCHEMA_ID = matchDecisionSchema.$id;
export const AUDIT_EVENT_SCHEMA_ID = auditEventSchema.$id;
export const WORKFLOW_ENVELOPE_SCHEMA_ID = workflowEnvelopeSchema.$id;

/** Issue #8 score weights. They sum to 1 and are not recomputed by issue #12. */
export const MATCH_WEIGHTS = {
  technicalRequirements: 0.3,
  experienceEvidence: 0.25,
  availability: 0.15,
  transportAccessibility: 0.2,
  salaryConditions: 0.1,
} as const;

/** Issue #8 aptitude bands applied to `score.weightedTotal`. */
export const APTITUDE_THRESHOLDS = {
  apt: 75,
  aptWithGaps: 50,
} as const;

export type Aptitude = "apt" | "apt_with_gaps" | "not_currently_apt";
export type SolverStrategy = "highs_milp" | "deterministic_greedy";
export type ConstraintResult = "pass" | "fail";
export type RoutingSource = "google_maps" | "local_matrix";
export type GapSeverity = "critical" | "minor";

export interface ScoreBreakdown {
  technicalRequirements: number;
  experienceEvidence: number;
  availability: number;
  transportAccessibility: number;
  salaryConditions: number;
  weightedTotal: number;
}

export interface MatchDecision {
  schemaVersion: "1.0.0";
  decisionId: string;
  traceId: string;
  candidateId: string;
  vacancyId: string;
  strategy: SolverStrategy;
  aptitude: Aptitude;
  score: ScoreBreakdown;
  hardConstraints: {
    mandatorySkills: ConstraintResult;
    schedule: ConstraintResult;
    salary: ConstraintResult;
    capacity: ConstraintResult;
    geographic: ConstraintResult;
  };
  transport: {
    feasible: boolean;
    source: RoutingSource;
  };
  gaps: Array<{
    id: string;
    severity: GapSeverity;
    description: string;
  }>;
  biasAlerts: Array<{
    id: string;
    reason: string;
  }>;
  promotion: { applied: boolean; humanApproved: boolean } | null;
  tieBreak: {
    deterministic: true;
    usedProtectedAttributes: false;
    usedRandomness: false;
  };
  reasons: Array<{
    code: string;
    message: string;
  }>;
}

export type WorkflowAgent =
  | "exploration"
  | "profile_and_evidence"
  | "market_and_matching"
  | "training";

export type GuardrailStage = "input" | "tool_result" | "permission" | "output";

export type GuardrailCode =
  | "ok"
  | "prompt_injection"
  | "pii_leakage"
  | "invalid_schema"
  | "invented_credential"
  | "unauthorized_tool";

export interface GuardrailVerdict {
  stage: GuardrailStage;
  allowed: boolean;
  code: GuardrailCode;
}

export type DqlState = "received" | "validated" | "processed" | "dead_letter";

export interface WorkflowEnvelope {
  traceId: string;
  idempotencyKey: string;
  agent: WorkflowAgent;
  schemaId: string;
  guardrails: GuardrailVerdict[];
  dqlState: DqlState;
}

export type AuditRole = "candidate" | "employer" | "counselor" | "system";
export type AuditAction = "approval" | "correction" | "rejection" | "submission";

export interface AuditEvent {
  eventId: string;
  traceId: string;
  idempotencyKey: string;
  actor: string;
  role: AuditRole;
  action: AuditAction;
  reason: string;
  timestamp: string;
  agent?: WorkflowAgent | null;
}

export const validateMatchDecision: ValidateFunction<MatchDecision> =
  ajv.compile<MatchDecision>(matchDecisionSchema);

export const validateAuditEvent: ValidateFunction<AuditEvent> =
  ajv.compile<AuditEvent>(auditEventSchema);

export const validateWorkflowEnvelope: ValidateFunction<WorkflowEnvelope> =
  ajv.compile<WorkflowEnvelope>(workflowEnvelopeSchema);

export function aptitudeForWeightedTotal(total: number): Aptitude {
  if (total >= APTITUDE_THRESHOLDS.apt) return "apt";
  if (total >= APTITUDE_THRESHOLDS.aptWithGaps) return "apt_with_gaps";
  return "not_currently_apt";
}

export function assertMatchDecision(value: unknown): asserts value is MatchDecision {
  if (!validateMatchDecision(value)) {
    throw new AjvValidationError("MatchDecision", validateMatchDecision.errors);
  }
  const expected = aptitudeForWeightedTotal(value.score.weightedTotal);
  if (value.aptitude !== expected) {
    throw new AjvValidationError("MatchDecision", [
      {
        instancePath: "/aptitude",
        schemaPath: "#/properties/aptitude",
        keyword: "aptitudeBand",
        params: { expected },
        message: `must be ${expected} for weightedTotal ${value.score.weightedTotal}`,
      },
    ]);
  }
}

export function assertAuditEvent(value: unknown): asserts value is AuditEvent {
  if (!validateAuditEvent(value)) {
    throw new AjvValidationError("AuditEvent", validateAuditEvent.errors);
  }
}

export function assertWorkflowEnvelope(value: unknown): asserts value is WorkflowEnvelope {
  if (!validateWorkflowEnvelope(value)) {
    throw new AjvValidationError("WorkflowEnvelope", validateWorkflowEnvelope.errors);
  }
}
