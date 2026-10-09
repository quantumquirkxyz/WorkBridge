---
name: "backend-queues"
category: "backend"
maturity: "stable"
version: "1"
description: "Design backend queues and background job systems — durability, retries, ordering, idempotency, and backpressure — with explicit delivery guarantees."
capabilities: ""
inputs:
  - type: object
    description: Job or event type, producer and consumer behavior, ordering needs, durability requirements, and failure cases.
outputs:
  - type: object
    description: Queue architecture, delivery guarantees, retry policy, idempotency plan, and observability checklist.
sideEffects: []
dependencies: []
stopCondition: "Queue behavior, recovery paths, and operator signals are explicit."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "queue-design"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/backend-queues.json"
diataxis: "how-to"
tags: ["backend"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: job/event type, producer and consumer behavior, ordering needs, durability requirements, expected volume, and failure cases.
- Output: queue architecture, delivery guarantees, retry policy, idempotency plan, and observability checklist.
- Scope: make at-least-once, at-most-once, and exactly-once claims explicit and conservative.
- Rule: make at-least-once, at-most-once, and exactly-once claims explicit and conservative.
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

Emit `BackendQueuesArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/backend-queues/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# backend-queues

Use this skill when designing background jobs, event consumers, message queues, worker pools, scheduled tasks, or asynchronous workflow boundaries.


## Rules

- Rule: define the delivery guarantee before designing retries.
- Rule: make every retried job idempotent or explain why duplicate execution is safe.
- Rule: separate transient failures, poison messages, and permanent business rejections.
- Rule: include backpressure behavior for producer overload and worker lag.
- Rule: expose queue depth, age, retry count, dead-letter count, and worker error rate.

## Why

Explicit queue semantics prevent data loss and duplicate work. Without them, retries and ordering assumptions diverge across producers and consumers.

## Steps

1. Identify producers, consumers, payload shape, and ownership boundaries.
2. Choose ordering, durability, acknowledgement, and retention semantics.
3. Design retry, timeout, dead-letter, and replay behavior.
4. Define idempotency keys and deduplication or compensation rules.
5. Plan scaling, backpressure, rate limits, and worker shutdown behavior.
6. Specify logs, metrics, alerts, and runbook checks.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml