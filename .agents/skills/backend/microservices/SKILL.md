---
name: "microservices"
category: "backend"
maturity: "stable"
version: "1"
description: "Design microservice architectures — service decomposition, inter-service communication, data ownership, resilience patterns — with explicit boundaries and failure isolation."
capabilities: ""
inputs:
  - type: object
    description: Domain context, team boundaries, scaling requirements, and communication constraints.
outputs:
  - type: object
    description: Service decomposition map, communication plan, data ownership matrix, and resilience strategy.
sideEffects: []
dependencies: []
stopCondition: "Design microservice architectures complete; artifact saved; completion criteria checked."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "backend"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/microservices.json"
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

Emit `MicroservicesArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/microservices/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# microservices

Design microservice architectures — service decomposition, inter-service communication, data ownership, resilience patterns — with explicit boundaries and failure isolation.

## Goals
- Decompose monoliths into bounded services
- Define clear ownership of data and behavior
- Plan synchronous and asynchronous communication
- Design for resilience and observability


## Why

Clear boundaries keep services independently deployable. Without them, coupling creates cascading failures and ownership ambiguity.

## Steps

1. **Map the domain** — identify bounded contexts and aggregates
2. **Define service boundaries** — single responsibility, high cohesion
3. **Assign data ownership** — which service owns which data
4. **Choose communication style** — REST, gRPC, message queue, event bus
5. **Design resilience** — timeouts, retries, circuit breakers, bulkheads
6. **Plan observability** — distributed tracing, centralized logging

## Rules

- Rule: do not split a service without a clear ownership, scaling, deployment, or team-boundary reason.
- Rule: assign exactly one owner for each source of truth.
- Rule: prefer asynchronous communication only when eventual consistency is acceptable and observable.
- Rule: include timeout, retry, idempotency, and circuit-breaker behavior for every cross-service call.
- Rule: account for distributed tracing, correlation IDs, and operational ownership from the start.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml