---
name: "backend-architecture"
category: "backend"
maturity: "stable"
version: "1"
description: "Shape backend systems — REST/gRPC APIs, service contracts, data flow, state management, error handling — with explicit seams and caller responsibilities."
capabilities: ""
inputs:
  - type: object
    description: API requirements, data model, transport constraints, and caller obligations.
outputs:
  - type: object
    description: Backend architecture proposal, API contract, service seam definition, and error-handling plan.
sideEffects: []
dependencies: []
stopCondition: "Shape backend systems complete; artifact saved; completion criteria checked."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "backend"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/backend-architecture.json"
diataxis: "how-to"
tags: ["backend"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: skill invocation with the user's request and available context.
- Output: a structured artifact or guidance aligned to the skill's declared outputs.
- Scope: stay within the skill's declared boundaries; do not broaden without explicit direction.
- Rule: documented standards override defaults; explicit project rules take precedence.
- Rule: if blocked by missing context or dependencies, surface the blocker before proceeding.

## Provenance

| Question | Answer |
|---|---|
| What is the source of truth? | The user's request, originating spec/issue, and the skill's declared outputs |
| What is in scope? | Work covered by the skill's acceptance criteria and completion rules |
| What is explicitly out of scope? | Files, behaviors, and decisions outside the skill's declared boundary |
| Who or what consumes this artifact afterward? | The next skill in the workflow or the user |
| What evidence proves it is done? | Completion criteria met, artifact saved, validation passed |
| What risk remains? | Subjective judgment calls, missing context, or external dependency failures


## Artifact

Emit `BackendArchitectureArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/backend-architecture/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# backend-architecture

Shape backend systems — REST/gRPC APIs, service contracts, data flow, state management, error handling — with explicit seams and caller responsibilities.

## Goals
- Design small, durable API seams
- Define request/response contracts explicitly
- Separate business logic from transport layer
- Plan for versioning and backward compatibility


## Why

Explicit seams make the backend evolvable. Without them, transport concerns leak inward and callers cannot rely on stable contracts.

## Steps

1. **Identify the domain model** — entities, aggregates, value objects
2. **Define API contracts** — request/response shapes, HTTP methods, status codes
3. **Choose transport protocol** — REST, gRPC, GraphQL, WebSocket
4. **Design service seams** — internal modules, data access layer
5. **Plan error handling** — typed errors, retry logic, circuit breakers
6. **Document the architecture** — ADR or README with diagrams

## Rules

- Rule: define service responsibilities before choosing transport details.
- Rule: make caller obligations, error semantics, and versioning rules explicit.
- Rule: keep business logic behind a stable interface rather than leaking transport concerns inward.
- Rule: include data ownership, persistence boundaries, and transaction assumptions.
- Rule: document operational concerns such as observability, rollout, and backward compatibility.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml