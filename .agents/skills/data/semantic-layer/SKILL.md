---
name: "semantic-layer"
category: "skill-dev/sandbox"
maturity: "stable"
version: "1"
description: "Design a semantic layer — dbt, Cube, metrics, dimensions, measures, self-service analytics — with explicit business logic, governance, and query optimization."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Semantic layer specification saved; dbt/Cube structure defined; governance rules documented."
risk: "low"
trustTier: "1"
maxIterations: "5"
promptVersion: "2.0"
artifactType: "data"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/semantic-layer.json"
diataxis: "how-to"
tags: ["data"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: analytical questions, source data inventory, business glossary, reporting requirements, user personas.
- Output: semantic layer specification + dbt/Cube structure + governance documentation.
- Scope: designs semantic layer; does not execute transformations or modify warehouse data unless explicitly instructed.
- Rule: designs semantic layer; does not execute transformations or modify warehouse data unless explicitly instructed.
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

Emit `SemanticLayerArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/semantic-layer/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Semantic Layer

Design a **semantic layer** — dbt, Cube, metrics, dimensions, measures, self-service analytics — with explicit business logic, governance, and query optimization.

## Process

### 1. Analytical requirements and glossary
- **Key questions:** revenue, churn, conversion, inventory turnover, customer lifetime value.
- **Business glossary:** canonical definitions for terms (e.g., "active user", "revenue", "churn").
- **User personas:** analyst, data scientist, executive, product manager; their tooling and access needs.
- **Source inventory:** tables, streams, APIs; freshness and quality status.

**Completion criterion:** analytical questions, business glossary, and source inventory documented.

### 2. Metrics and measures design
- **Metric types:** simple (count, sum), ratio (revenue per user), rate (conversion rate), cumulative (MTD revenue), derived (NPS score).
- **Formula specification:** exact SQL or expression; handling of nulls, duplicates, filters.
- **Grain:** per row, per user per day, per transaction; consistent grain prevents double counting.
- **Filters:** time window (last 30 days, YTD), segment (region, product line), exclusion criteria.
- **Time zone and currency:** explicit time zone for time-based metrics; currency and rounding for financial metrics.

**Completion criterion:** metrics catalog with formulas, grain, and filters defined.

### 3. Dimensions and attributes
- **Dimensions:** time, geography, product, customer, channel, device, experiment.
- **Attributes:** hierarchy (year → quarter → month → day), display names, formatting.
- **Relationships:** foreign keys between dimensions and facts; many-to-many resolution.
- **Filtering behavior:** how nulls, unknowns, and defaults are handled; drill-down paths.

**Completion criterion:** dimensions, attributes, and relationships documented.

### 4. dbt model structure
- **Layers:** staging (raw, cleaned, renamed), intermediate (joined, deduplicated), marts (business-level, metric-ready).
- **Naming conventions:** `stg_`, `int_`, `fct_`, `dim_` prefixes; snake_case.
- **Materialisations:** view, table, incremental; choose based on query cost and freshness needs.
- **Tests:** uniqueness, not null, referential integrity, accepted values.
- **Documentation:** model descriptions, column descriptions, lineage graph.

**Completion criterion:** dbt layer structure, naming conventions, and test plan defined.

### 5. Cube (or equivalent) configuration
- **Cubes:** one per domain (sales, product, marketing, finance); dimensions and measures inside.
- **Pre-aggregations:** rollups for common queries (daily, weekly, monthly); query acceleration.
- **Security:** row-level and column-level access; role-based visibility; PII handling.
- **API and caching:** REST / GraphQL / SQL API; query result caching; refresh policy.
- **Integration:** BI tools (Tableau, Looker, Superset), notebooks, embedded analytics.

**Completion criterion:** Cube configuration, pre-aggregation strategy, and security rules defined.

### 6. Governance and lineage
- **Ownership:** metric owner, domain owner, reviewer for changes.
- **Lineage:** source table → staging → intermediate → mart → metric; visual lineage.
- **Change management:** process for adding, deprecating, or modifying metrics; stakeholder sign-off.
- **Self-service guardrails:** certified vs experimental metrics; approved data sources; usage guidelines.
- **Monitoring:** query performance, cache hit rate, metric usage frequency, slow queries.

**Completion criterion:** governance model, lineage documentation, and monitoring plan saved.

## Rules

- Rule: every metric must have a single, authoritative definition with explicit formula and grain.
- Rule: never redefine a metric without a deprecation period and explicit migration path.
- Rule: keep semantic logic in the semantic layer, not in BI tool reports or ad-hoc queries.
- Rule: require metric owner sign-off before promoting a metric to certified status.
- Rule: document lineage from raw source to metric for auditability and debugging.
- Rule: enforce row-level and column-level security at the semantic layer boundary.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml