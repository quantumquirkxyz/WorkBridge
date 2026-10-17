import type { MatchDecision, WorkflowEnvelope } from "@puente/domain";

/** One WorkflowEnvelope builder for unit tests and Playwright. */
export function sampleWorkflowEnvelope(traceId: string, idempotencyKey: string): WorkflowEnvelope {
  return {
    traceId,
    idempotencyKey,
    agent: "market_and_matching",
    schemaId: "https://puentelaboral.pa/schemas/assumed-match-decision.schema.json",
    guardrails: [{ stage: "output", allowed: true, code: "ok" }],
    dqlState: "validated",
  };
}

/** One MatchDecision shape for the application tests. Callers override the fields a case cares about. */
export function sampleMatchDecision(input: {
  traceId: string;
  candidateId?: string;
  vacancyId?: string;
  decisionId?: string;
  total?: number;
  aptitude?: MatchDecision["aptitude"];
  strategy?: MatchDecision["strategy"];
  transport?: MatchDecision["transport"];
  gaps?: MatchDecision["gaps"];
  biasAlerts?: MatchDecision["biasAlerts"];
  reason?: string;
}): MatchDecision {
  const total = input.total ?? 80;
  return {
    schemaVersion: "1.0.0",
    decisionId: input.decisionId ?? `dec-${input.traceId}`,
    traceId: input.traceId,
    candidateId: input.candidateId ?? "candidate",
    vacancyId: input.vacancyId ?? "vac-1",
    strategy: input.strategy ?? "highs_milp",
    aptitude: input.aptitude ?? "apt",
    score: {
      technicalRequirements: total,
      experienceEvidence: total,
      availability: total,
      transportAccessibility: total,
      salaryConditions: total,
      weightedTotal: total,
    },
    hardConstraints: {
      mandatorySkills: "pass",
      schedule: "pass",
      salary: "pass",
      capacity: "pass",
      geographic: "pass",
    },
    transport: input.transport ?? { feasible: true, source: "local_matrix" },
    gaps: input.gaps ?? [],
    biasAlerts: input.biasAlerts ?? [],
    promotion: null,
    tieBreak: { deterministic: true, usedProtectedAttributes: false, usedRandomness: false },
    reasons: [{ code: "score", message: input.reason ?? "apto" }],
  };
}
