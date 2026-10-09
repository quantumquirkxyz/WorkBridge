---
name: "data-lineage"
category: "data"
maturity: "stable"
version: "1"
description: "Data lineage (end-to-end tracing, impact analysis, column-level lineage, governance)."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Lineage graph saved; impact analysis complete; column mappings documented."
risk: "medium"
trustTier: "3"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "data"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/data-lineage.json"
diataxis: "how-to"
tags: ["data"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: source systems, transformation logic, target systems, governance requirements.
- Output: lineage graph + impact analysis + column-level mapping.
- Scope: traces lineage; does not modify pipelines.
- Rule: traces lineage; does not modify pipelines.
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

Emit `DataLineageArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/data-lineage/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Data Lineage

Design **data lineage** — end-to-end tracing, impact analysis, column-level lineage, and governance support.

## Process

### 1. Inventory sources and targets
- Identify all source systems (databases, APIs, files, streams).
- Identify all target systems (warehouses, lakes, marts, dashboards).
- Capture ownership and SLAs for each system.

**Completion criterion:** source/target inventory saved.

### 2. Map transformations
- Extract: ingestion jobs, CDC captures, batch loads.
- Transform: cleaning, enrichment, aggregation, deduplication.
- Load: writes to targets, materialised views, BI exports.

**Completion criterion:** transformation map saved.

### 3. Build end-to-end lineage graph
- Nodes: sources, transformations, targets, dashboards, ML models.
- Edges: data flow direction, schedule, volume, freshness.
- Format: directed acyclic graph (DAG) with metadata.

**Completion criterion:** lineage graph saved (ASCII / Mermaid / diagram).

### 4. Column-level lineage
- Track column names, types, and transformations per field.
- Capture renaming, type casting, derivation, and aggregation.
- Link business terms to technical columns.

**Completion criterion:** column-level mapping saved.

### 5. Impact analysis
- Given a schema change, identify affected downstream assets.
- Prioritise by criticality, usage, and SLA.
- Document remediation steps and communication plan.

**Completion criterion:** impact analysis report saved.

### 6. Governance integration
- Tag lineage with data classification (PII, sensitive, public).
- Attach owners, stewards, and retention policies.
- Link to compliance requirements (GDPR, HIPAA, SOX).

**Completion criterion:** governance tags and policies saved.

## Rules

- Rule: trace lineage from source to consumer before declaring impact scope.
- Rule: classify data assets at ingestion time and enforce access boundaries from lineage metadata.
- Rule: separate technical lineage (ETL jobs, queries) from business lineage (reports, dashboards).
- Rule: require owner and steward consent for schema or ownership changes.
- Rule: make lineage queries auditable and retention-aligned with compliance windows.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml