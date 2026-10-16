# Assumed signatures for issues #8 and #9

Issue #12 consumes these contracts. It does not implement the HiGHS solver,
the Google Maps routing call, the Mastra workflow, or the model guardrail
runner. The JSON Schemas under `packages/domain/src/schemas/` are the source
of truth; the TypeScript below is the signature application code imports.

## Issue #8 — `MatchDecision`

Schema: `packages/domain/src/schemas/match-decision.schema.json`  
`$id`: `https://puentelaboral.pa/schemas/match-decision.schema.json`

```ts
export const MATCH_WEIGHTS = {
  technicalRequirements: 0.3,
  experienceEvidence: 0.25,
  availability: 0.15,
  transportAccessibility: 0.2,
  salaryConditions: 0.1,
} as const;

export const APTITUDE_THRESHOLDS = { apt: 75, aptWithGaps: 50 } as const;

export type SolverStrategy = "highs_milp" | "deterministic_greedy";
export type Aptitude = "apt" | "apt_with_gaps" | "not_currently_apt";
export type RoutingSource = "google_maps" | "local_matrix";

export interface MatchDecision {
  schemaVersion: "1.0.0";
  decisionId: string;
  traceId: string;
  candidateId: string;
  vacancyId: string;
  strategy: SolverStrategy;
  aptitude: Aptitude;
  score: {
    technicalRequirements: number;
    experienceEvidence: number;
    availability: number;
    transportAccessibility: number;
    salaryConditions: number;
    weightedTotal: number;
  };
  hardConstraints: {
    mandatorySkills: "pass" | "fail";
    schedule: "pass" | "fail";
    salary: "pass" | "fail";
    capacity: "pass" | "fail";
    geographic: "pass" | "fail";
  };
  transport: { feasible: boolean; source: RoutingSource };
  gaps: Array<{ id: string; severity: "critical" | "minor"; description: string }>;
  biasAlerts: Array<{ id: string; reason: string }>;
  promotion: { applied: boolean; humanApproved: boolean } | null;
  tieBreak: {
    deterministic: true;
    usedProtectedAttributes: false;
    usedRandomness: false;
  };
  reasons: Array<{ code: string; message: string }>;
}
```

`assertMatchDecision` accepts a document only when it validates and
`aptitude` matches `score.weightedTotal`: `>= 75` is `apt`, `>= 50` is
`apt_with_gaps`, otherwise `not_currently_apt`.

`strategy: "highs_milp"` is the primary solver signature.
`strategy: "deterministic_greedy"` is the fallback signature.
`transport.source` is `"google_maps"` or the local-matrix fallback.
`tieBreak` refuses protected attributes and randomness.

## Issue #9 — workflow envelope and audit event

### `WorkflowEnvelope`

Schema: `packages/domain/src/schemas/workflow-envelope.schema.json`  
`$id`: `https://puentelaboral.pa/schemas/workflow-envelope.schema.json`

```ts
export type WorkflowAgent =
  | "exploration"
  | "profile_and_evidence"
  | "market_and_matching"
  | "training";

export interface GuardrailVerdict {
  stage: "input" | "tool_result" | "permission" | "output";
  allowed: boolean;
  code:
    | "ok"
    | "prompt_injection"
    | "pii_leakage"
    | "invalid_schema"
    | "invented_credential"
    | "unauthorized_tool";
}

export interface WorkflowEnvelope {
  traceId: string;
  idempotencyKey: string;
  agent: WorkflowAgent;
  schemaId: string;
  guardrails: GuardrailVerdict[];
  dqlState: "received" | "validated" | "processed" | "dead_letter";
}
```

`traceId` and `idempotencyKey` are required on every accepted call.
The four `stage` values are the guardrail planes from #9.
A blocking `code` means the plane refused the payload; #12 does not invoke a model to produce that verdict.

### `AuditEvent`

Schema: `packages/domain/src/schemas/audit-event.schema.json`  
`$id`: `https://puentelaboral.pa/schemas/audit-event.schema.json`

```ts
export interface AuditEvent {
  eventId: string;
  traceId: string;
  idempotencyKey: string;
  actor: string;
  role: "candidate" | "employer" | "counselor" | "system";
  action: "approval" | "correction" | "rejection" | "submission";
  reason: string;
  timestamp: string;
  agent?: WorkflowAgent | null;
}
```

#12 appends one valid `AuditEvent` for every approval, correction, rejection,
and submission. `actor`, `role`, `timestamp`, `reason`, and `traceId` are
mandatory. The role values `candidate`, `employer`, and `counselor` are the
Better Auth `session.user.role` values used by #12.

## Better Auth session consumed by #12

```ts
export interface BetterAuthSession {
  session: { id: string; userId: string; expiresAt: string };
  user: {
    id: string;
    email: string;
    role: "candidate" | "employer" | "counselor";
  };
  signature: string;
}
```

The server reads the role only from `session.user.role` after `signature`
matches an HMAC of the session fields with `BETTER_AUTH_SECRET`. `session.userId`
must equal `user.id`. An `expiresAt` in the past is rejected. A client cannot
change the role without invalidating the signature.
