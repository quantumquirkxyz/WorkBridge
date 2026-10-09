---
name: "data-quality"
category: "skill-dev/sandbox"
maturity: "stable"
version: "1"
description: "Design data quality frameworks — Great Expectations, Soda, checks, observability, contracts — with explicit SLAs, freshness rules, and incident response for bad data."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Framework defined; check suite configured; observability and contract rules documented."
risk: "medium"
trustTier: "3"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "data"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/data-quality.json"
diataxis: "how-to"
tags: ["data"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: data inventory, producer/consumer map, SLAs, freshness requirements.
- Output: data quality framework + check suite + observability + data contract.
- Scope: designs quality framework; does not execute data pipelines or modify production data unless explicitly instructed.
- Rule: designs quality framework; does not execute data pipelines or modify production data unless explicitly instructed.
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

Emit `DataQualityArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/data-quality/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Data Quality

Design a **data quality framework** — Great Expectations, Soda, checks, observability, contracts — with explicit SLAs, freshness rules, and incident response for bad data.

## Process

### 1. Inventory and ownership
- Data assets (tables, streams, files, APIs) with owners.
- Producer/consumer map (who writes, who reads, downstream dependencies).
- Criticality tiers (P0: financial / safety; P1: operational; P2: analytical).
- SLA definitions (freshness, completeness, accuracy).

**Completion criterion:** data inventory with owners and criticality tiers documented.

### 2. Quality dimensions
- Freshness (staleness threshold, lag alerts).
- Volume (row count, file size, expected range).
- Distribution (value ranges, null percentages, duplicates, cardinality).
- Referential integrity (foreign keys, joins, orphaned records).
- Uniqueness (primary keys, business keys).
- Validity (schema conformance, type checks, regex patterns).

**Completion criterion:** quality dimensions mapped to assets with thresholds.

### 3. Check suite design
- Expectation types (row count, column null %, unique, value set, regex, cross-column).
- Thresholds and tolerances (hard fail, warning, drift detection).
- Anomaly detection (seasonality-aware, change point detection).
- Check placement (ingestion, transformation, warehouse load, API response).

**Completion criterion:** check suite with thresholds and placement defined.

### 4. Tooling and implementation
- Tool selection (Great Expectations, Soda, Monte Carlo, custom SQL).
- Integration points (Airflow, dbt, Spark, Kafka, CI/CD).
- Check execution (scheduled, event-driven, on-demand).
- Result storage and versioning (expectation suite as code).

**Completion criterion:** tool selection and integration plan defined.

### 5. Observability and alerting
- Metrics (pass rate, failure count, time-to-detect, time-to-resolve).
- Dashboards (per-table health, SLA compliance, trend over time).
- Alert routing (on-call, data owner, platform team).
- Incident response (runbook, severity, escalation for data incidents).

**Completion criterion:** observability dashboard and alerting rules defined.

### 6. Data contracts
- Schema and semantics (column names, types, units, allowed values).
- Producer guarantees (freshness, completeness, format version).
- Consumer obligations (handling nulls, handling schema changes, deprecation notice).
- Versioning and breaking change policy.

**Completion criterion:** data contract specification with versioning policy defined.

## Rules

- Rule: treat data quality as a product feature, not an afterthought; assign owners.
- Rule: define SLAs in terms of business impact, not just technical thresholds.
- Rule: run checks as close to the source as possible; fail fast and loud.
- Rule: version expectation suites alongside data models and pipeline code.
- Rule: require data contracts for any cross-team or cross-service data exchange.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml