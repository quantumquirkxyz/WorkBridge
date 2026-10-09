---
name: "feature-store"
category: "data"
maturity: "stable"
version: "1"
description: "Feature store (online/offline, feature engineering, serving, monitoring, drift)."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Architecture diagram saved; feature definitions documented; monitoring plan present."
risk: "medium"
trustTier: "3"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "data"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/feature-store.json"
diataxis: "how-to"
tags: ["data"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: ML use cases, feature candidates, latency requirements, SLA.
- Output: feature store architecture + feature definitions + monitoring plan.
- Scope: designs feature store; execution requires approval.
- Rule: designs feature store; execution requires approval.
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

Emit `FeatureStoreArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/feature-store/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Feature Store

Design a **feature store** — online/offline, feature engineering, serving, monitoring, and drift detection.

## Process

### 1. Use case and requirements
- Inference latency: real-time (ms), batch (minutes/hours).
- Feature types: categorical, numerical, embedding, time-series.
- Freshness: real-time, near-real-time, daily.
- Team: data scientists, ML engineers, platform team.

**Completion criterion:** use cases and requirements saved.

### 2. Architecture design
- Online store: Redis, DynamoDB, Cassandra, Feast.
- Offline store: S3, GCS, data warehouse, Delta Lake.
- Serving layer: REST / gRPC / feature server.
- Transformation: batch (Spark, dbt) vs streaming (Flink, Kafka Streams).

**Completion criterion:** architecture diagram saved.

### 3. Feature definitions and schemas
- Feature: name, description, type, entity, value type, TTL.
- Entities: user, item, session, device.
- Features: user features (history, demographics), item features (attributes, popularity).
- Point-in-time correctness: avoid leakage with event-time joins.

**Completion criterion:** feature definitions and schemas saved.

### 4. Feature engineering
- Reusable transformations: standardise, normalise, encode, aggregate.
- Feature pipelines: batch backfill vs streaming updates.
- Testing: unit tests for transformations, data quality checks.

**Completion criterion:** transformation logic documented.

### 5. Serving and latency
- Online serving: low-latency lookups, caching, TTL eviction.
- Consistency: online vs offline alignment, point-in-time joins.
- Scalability: sharding, replication, load balancing.

**Completion criterion:** serving design saved.

### 6. Monitoring and drift detection
- Feature quality: null rate, type violations, out-of-range.
- Feature drift: distribution shift (KS test, PSI, Wasserstein).
- Alerting: thresholds, notifications, on-call runbook.
- Model impact: link feature drift to model performance degradation.

**Completion criterion:** monitoring and drift plan saved.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml