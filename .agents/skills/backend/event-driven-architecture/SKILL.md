---
name: "event-driven-architecture"
category: "backend"
maturity: "stable"
version: "1"
description: "Event-driven architecture (Kafka, NATS, EventBridge, choreography vs orchestration)."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Event-driven architecture design complete; artifact saved; completion criteria checked."
risk: "medium"
trustTier: "3"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "backend"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/event-driven-architecture.json"
diataxis: "how-to"
tags: ["backend"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: business workflows, service boundaries, data change frequency, and consistency requirements.
- Output: event architecture with topic/stream design, schema registry plan, and flow diagrams.
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

Emit `EventDrivenArchitectureArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/event-driven-architecture/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Event-Driven Architecture

Use this skill when designing event-driven systems — Kafka, NATS, EventBridge, SQS/SNS — with choreography, orchestration, event schemas, and delivery guarantees.


## Process

### 1. Inventory events and workflows
- List business events and their producers and consumers.
- Identify synchronous vs asynchronous boundaries and where eventual consistency is acceptable.
- Map workflows that span multiple services.

**Completion criterion:** event inventory and workflow map documented.

### 2. Choose messaging pattern
- Evaluate choreography (each service reacts to events independently) vs orchestration (central coordinator).
- Choose broker: Kafka (high throughput, log-based), NATS (lightweight, low latency), EventBridge (serverless, AWS-native), or SQS/SNS (simple queueing).
- Justify choice against durability, ordering, throughput, and operational cost.

**Completion criterion:** pattern and broker chosen with rationale per workflow.

### 3. Design topics, streams, and queues
- Define topic naming convention, partition strategy, and retention policy.
- Plan consumer groups, subscription patterns, and replay requirements.
- Design dead-letter queues and retry policies for poison messages.

**Completion criterion:** topic/stream design documented with partition, retention, and DLQ strategy.

### 4. Define event schema and contracts
- Choose schema format (Avro, Protobuf, JSON Schema) and schema registry tooling.
- Define backward and forward compatibility rules for schema evolution.
- Document required vs optional fields and schema versioning policy.

**Completion criterion:** schema format, compatibility rules, and versioning policy documented.

### 5. Plan delivery guarantees and idempotency
- Define required delivery semantics per event type: at-most-once, at-least-once, exactly-once.
- Design idempotency keys and consumer deduplication strategies.
- Plan ordering guarantees where required and how to handle out-of-order delivery.

**Completion criterion:** delivery guarantee matrix and idempotency strategy documented.

### 6. Design observability and operations
- Configure metrics: publish rate, consume rate, consumer lag, error rate, retry rate.
- Enable distributed tracing with event context propagation.
- Document schema migration procedure and consumer compatibility testing.

**Completion criterion:** observability strategy and operational runbook documented.

## Rules

- Rule: never couple event schema to internal database schema; use an anti-corruption layer.
- Rule: treat events as immutable; never update or delete a published event.
- Rule: version schemas from day one; breaking changes require a new topic or schema version.
- Rule: design consumers to be resilient to missing, duplicate, or out-of-order events.
- Rule: set retention and compaction policies based on replay and debugging needs, not unlimited storage.
- Rule: avoid chatty event topologies; prefer fewer, richer events over many tiny events.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml