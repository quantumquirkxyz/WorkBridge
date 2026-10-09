---
name: "data-streaming"
category: "skill-dev/sandbox"
maturity: "stable"
version: "1"
description: "Design streaming data pipelines — Kafka, Kinesis, Pub/Sub, Flink — with event schemas, stream processing, and real-time analytics."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Topology diagram saved; event schema defined; processing rules documented."
risk: "medium"
trustTier: "3"
maxIterations: "5"
promptVersion: "2.0"
artifactType: "data"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/data-streaming.json"
diataxis: "how-to"
tags: ["data"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: stream source descriptions, processing requirements, latency/throughput targets.
- Output: topology design + event schema + processing rules.
- Scope: designs stream; executes only with explicit approval.
- Rule: designs stream; executes only with explicit approval.
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

Emit `DataStreamingArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/data-streaming/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Streaming Pipeline Design

Design a **streaming pipeline** — event producers, stream processors, consumers — with schema, processing rules, and reliability.

## Process

### 1. Source analysis
- Event sources: user actions, sensors, logs, transactions, external APIs.
- Event rate (events/sec), burst rate, volume (GB/day).
- Event schema: fields, types, optional/required, nesting.

**Completion criterion:** source profile saved.

### 2. Event schema
- Define Avro / Protobuf / JSON Schema.
- Versioning: schema registry (Confluent Schema Registry / AWS Glue / GCP Pub/Sub schema).
- Backward/forward compatibility rules.

**Completion criterion:** schema saved; versioning rules defined.

### 3. Stream topology
- **Producers:** service A, B, C; publish to topic/stream.
- **Stream:** partitioned by key (e.g. user_id, device_id) for parallel processing.
- **Processors:** stream jobs (Flink / Kafka Streams / Spark Streaming / Kinesis Analytics) — filter, aggregate, enrich, transform.
- **Consumers:** service D reads results; may write to database / cache / warehouse.

**Completion criterion:** topology diagram saved.

### 4. Processing rules
- Windowing: tumbling, sliding, session, custom.
- Aggregation: count, sum, average, max, min; with watermarks.
- Enrichment: join with reference data (stream or database lookup).
- Exactly-once / at-least-once / at-most-once semantics per use case.
- Backpressure: when downstream is slow, how to handle (drop old, throttle, buffer with limit).

**Completion criterion:** rules saved.

### 5. Reliability
- Replication: stream replicas across zones.
- Retention: data retention period; archive to storage for long-term.
- Monitoring: lag per partition; error rate; throughput; processing latency.
- Alert: lag > threshold; error rate > threshold; partition unassigned.

**Completion criterion:** reliability rules saved.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml