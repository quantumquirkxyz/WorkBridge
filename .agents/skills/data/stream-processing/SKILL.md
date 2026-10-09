---
name: "stream-processing"
category: "data"
maturity: "stable"
version: "1"
description: "Stream processing (Flink, Kafka Streams, RisingWave, windowing, state, exactly-once)."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Topology diagram saved; windowing strategy defined; exactly-once plan documented."
risk: "medium"
trustTier: "3"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "pull-request"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/stream-processing.json"
diataxis: "how-to"
tags: ["data"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: stream sources, processing logic, state requirements, delivery guarantees.
- Output: stream topology + windowing design + exactly-once plan.
- Scope: designs stream jobs; execution requires approval.
- Rule: designs stream jobs; execution requires approval.
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

Emit `StreamProcessingArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/stream-processing/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Stream Processing

Design **stream processing** — Flink, Kafka Streams, RisingWave, windowing, state management, and exactly-once semantics.

## Process

### 1. Source and sink analysis
- Sources: Kafka topics, Kinesis streams, Pulsar, IoT hubs.
- Sinks: databases, data lakes, object stores, downstream streams.
- Schema: Avro, Protobuf, JSON, Parquet; schema registry usage.

**Completion criterion:** source/sink inventory saved.

### 2. Processing topology
- Stateless: filter, map, flatMap, enrich.
- Stateful: aggregations, joins, pattern detection.
- Branching: fan-out, side outputs, branching streams.

**Completion criterion:** topology diagram saved (ASCII / Mermaid).

### 3. Windowing strategies
- Tumbling: fixed-size, non-overlapping windows.
- Sliding: overlapping windows with slide interval.
- Session: activity-based windows with gap timeout.
- Global: all-data window for bounded streams.

**Completion criterion:** windowing strategy saved with justification.

### 4. State management
- Keyed state: value state, list state, map state, reduction state.
- State backend: RocksDB (disk), in-memory (fast, limited), tiered.
- State TTL: retention, cleanup, recovery.
- Checkpointing: synchronous vs asynchronous, barrier alignment.

**Completion criterion:** state design saved.

### 5. Exactly-once semantics
- Checkpointing: barrier-based, consistent snapshots.
- Two-phase commit: for sinks that support it (Kafka, transactional DBs).
- Idempotent writes: deduplication keys, upserts.
- Recovery: restore from checkpoint, replay from offsets.

**Completion criterion:** exactly-once plan saved.

### 6. Fault tolerance and scaling
- Parallelism: source, operator, sink parallelism.
- Scaling: rescaling with savepoints, state migration.
- Backpressure handling: buffering, flow control, monitoring.

**Completion criterion:** fault tolerance plan saved.

## Rules

- Rule: choose the processing framework against throughput, state size, and operational complexity.
- Rule: define windowing, state TTL, and checkpointing before scaling.
- Rule: separate stateless processing from stateful processing so scaling is explicit.
- Rule: require idempotent sinks or deduplication for sensitive downstream systems.
- Rule: monitor backpressure, checkpoint lag, and state size as primary operational signals.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml