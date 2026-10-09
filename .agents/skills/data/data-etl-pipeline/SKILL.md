---
name: "data-etl-pipeline"
category: "skill-dev/sandbox"
maturity: "stable"
version: "1"
description: "Design ETL / ELT pipelines — extraction, transformation, load — with reproducible steps, schema evolution, quality checks, and observability."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Pipeline architecture saved; quality rules defined; schema evolution plan present."
risk: "medium"
trustTier: "3"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "data"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/data-etl-pipeline.json"
diataxis: "how-to"
tags: ["data"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: source data descriptions, target schema, quality requirements.
- Output: pipeline architecture + quality rules + schema evolution.
- Scope: defines pipeline; execution requires approval.
- Rule: defines pipeline; execution requires approval.
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

Emit `DataEtlPipelineArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/data-etl-pipeline/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# ETL Pipeline Design

Design an **ETL / ELT pipeline** — extraction, transformation, load — with reproducible steps, schema evolution, and data quality checks.

## Process

### 1. Source analysis
- Source type: database (SQL / NoSQL), file (CSV / JSON / Parquet / ORC), API (REST / GraphQL / gRPC), stream (Kafka / Kinesis / Pub/Sub).
- Schema: columns, types, constraints.
- Frequency: batch (hourly / daily) or streaming (near real-time).
- Volume: rows / GB per run.
- Quality issues: missing values, out-of-range, duplicates, format errors.

**Completion criterion:** source profile saved.

### 2. Transformation design
- Filter: remove rows that don't meet criteria.
- Clean: fix types, trim whitespace, standardise formats.
- Aggregate: group by key, compute statistics.
- Enrich: join with reference data (customer, product, geography).
- Deduplicate: exact / fuzzy / probabilistic.

**Completion criterion:** transformation steps documented.

### 3. Load design
- Target type: warehouse (Snowflake / BigQuery / Redshift / Databricks) vs database vs lake.
- Load strategy: full refresh (replace all) / incremental (append new / update changed) / merge (upsert).
- Partition / clustering strategy for performance.
- Backfill plan for historical data.

**Completion criterion:** load strategy saved.

### 4. Data quality
- Null rate per column (threshold: < X%).
- Out-of-range checks (min / max / expected range).
- Duplicate rate.
- Referential integrity (foreign key consistency).
- Freshness (data delay from source to target).

**Completion criterion:** quality rules saved with thresholds and actions (fail / warn / fix).

### 5. Schema evolution
- How to handle new columns (add, ignore, raise error).
- How to handle renamed / deleted columns.
- Versioning: schema registry (e.g. Confluent Schema Registry, AWS Glue Data Catalog).

**Completion criterion:** evolution plan saved.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml