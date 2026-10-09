---
name: "db-nosql-modeling"
category: "skill-dev/sandbox"
maturity: "stable"
version: "1"
description: "Design NoSQL data models — document, key-value, wide-column, graph, time-series — with access pattern analysis, consistency requirements, and schema evolution."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Design NoSQL data models complete; required sections present; completion criteria checked."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "model"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/db-nosql-modeling.json"
diataxis: "how-to"
tags: ["db"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: skill invocation with the user's request and available context.
- Output: a structured artifact or guidance aligned to the skill's declared outputs.
- Scope: stay within the skill's declared boundaries; do not broaden without explicit direction.
- Rule: follow the skill's completion criteria and stop condition exactly.

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

Emit `DbNosqlModelingArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/db-nosql-modeling/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# NoSQL Data Modeling

Design a **NoSQL data model** — document, key-value, wide-column, graph, time-series — with access pattern analysis and consistency trade-offs.

## When to use

- A domain naturally fits a NoSQL store (events, social graph, time-series, cache).
- Relational schema has been over-normalised for the read/write pattern.
- Scalability requirements push past a single RDBMS instance.

## Process

1. Identify access patterns — reads (by key, range, full-text, graph traversal) and writes (append, upsert, batch); frequency and latency requirements.
2. Choose NoSQL type:
   - Document (MongoDB, Couchbase): nested JSON, flexible schema.
   - Key-value (Redis, DynamoDB): simple get/put by key.
   - Wide-column (Cassandra, ScyllaDB): time-series, high-write throughput.
   - Graph (Neo4j, DynamoDB GSI): many-to-many, traversals.
   - Time-series (InfluxDB, TimescaleDB): metric ingestion, downsampling.
3. Design data layout — document structure, key design (partition + sort), column families, graph topology.
4. Consistency model — strong vs eventual; how does this affect correctness of reads?
5. Schema evolution — how are new fields / relationships added without downtime?
6. Scalability — partition/shard key; replication factor; read replicas; hot-key mitigation; backup and restore behavior.
7. Deliver — artifact with access patterns, selected store type, data layout, consistency model, schema evolution plan, and scaling risks.

## Rules

- Rule: design from access patterns before choosing a NoSQL product.
- Rule: state partition keys, sort keys, document boundaries, or graph traversal anchors explicitly.
- Rule: account for consistency, conflict resolution, and read-your-writes expectations.
- Rule: plan schema evolution and backfill paths for existing records.
- Rule: identify hot partitions, fan-out, and query patterns that the model cannot serve.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml