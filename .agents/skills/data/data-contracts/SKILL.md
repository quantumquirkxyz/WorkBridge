---
name: "data-contracts"
category: "skill-dev/sandbox"
maturity: "stable"
version: "1"
description: "Design data contracts — schema evolution, producer-consumer agreements, schema registry, breaking change detection — with explicit compatibility rules and versioning."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Contract specification saved; evolution policy defined; registry configuration documented."
risk: "medium"
trustTier: "3"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "data"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/data-contracts.json"
diataxis: "how-to"
tags: ["data"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: data producer/consumer inventory, schema definitions, quality requirements, regulatory constraints.
- Output: data contract specification + schema evolution policy + registry configuration.
- Scope: designs contracts and evolution policy; does not modify production registry or execute data pipelines unless explicitly instructed.
- Rule: designs contracts and evolution policy; does not modify production registry or execute data pipelines unless explicitly instructed.
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

Emit `DataContractsArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/data-contracts/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Data Contracts

Design **data contracts** — schema evolution, producer-consumer agreements, schema registry, breaking change detection — with explicit compatibility rules and versioning.

## Process

### 1. Producer-consumer inventory
- **Producers:** services, teams, systems that emit or write data.
- **Consumers:** downstream services, analytics, ML pipelines, reporting.
- **Criticality:** P0 (revenue/safety), P1 (operational), P2 (analytical).
- **Ownership:** data product owner, producer team, consumer team.
- **Dependency map:** which consumers depend on which datasets; blast radius analysis.

**Completion criterion:** producer-consumer inventory with ownership and criticality documented.

### 2. Schema and semantic definition
- **Schema:** column names, types, formats, nullability, constraints (primary keys, foreign keys).
- **Semantics:** units, currency, timezone, encoding, business meaning, allowed values.
- **Quality expectations:** completeness thresholds, freshness SLAs, distribution constraints.
- **Governance:** classification (PII, sensitive, public), retention policy, access controls.

**Completion criterion:** schema and semantic definition saved with quality expectations.

### 3. Schema evolution policy
- **Compatibility levels:** backward compatible (consumers can read old schema), forward compatible (consumers can read new schema), full compatible, none.
- **Allowed changes:** add optional field (backward), remove optional field (forward), add required field (breaking), remove required field (breaking), rename field (breaking with alias), type widening (backward), type narrowing (breaking).
- **Versioning:** semantic versioning for schemas (v1, v2, v3) or compatibility IDs.
- **Deprecation policy:** sunset timeline, notification period (e.g., 90 days), fallback behavior.

**Completion criterion:** compatibility matrix and deprecation policy saved.

### 4. Schema registry configuration
- **Registry selection:** Confluent Schema Registry, AWS Glue Data Catalog, Apicurio Registry, internal solution.
- **Subject naming:** convention for topics/tables and schemas (e.g., `{domain}-{dataset}-{version}`).
- **Validation:** enforce schema validation at write time; reject invalid payloads.
- **Access control:** who can register schemas, who can read, admin roles.
- **Integration:** CI/CD hooks for schema validation, producer/consumer SDK configuration.

**Completion criterion:** registry configuration and naming convention documented.

### 5. Breaking change detection and enforcement
- **Automated checks:** CI pipeline step that compares proposed schema changes against compatibility rules.
- **Tooling:** schema registry compatibility API, custom diff tools, Pact-like contract testing.
- **Gate mechanism:** PR blocked if schema change breaks compatibility without explicit approval and migration plan.
- **Migration plan:** for breaking changes, require producer migration steps, consumer migration steps, dual-write / backfill / shadow traffic strategy.
- **Runbook:** what to do when a breaking change is detected in production; rollback, alert, and communication procedure.

**Completion criterion:** breaking change detection workflow and enforcement gates documented.

## Rules

- Rule: every dataset with multiple consumers must have a signed data contract.
- Rule: treat schema changes as production changes; require review, testing, and approval.
- Rule: prefer additive changes (backward compatible) over breaking changes.
- Rule: enforce schema validation at the boundary (producer write, consumer read).
- Rule: maintain a schema registry as the single source of truth for dataset schemas.
- Rule: require explicit migration plans and consumer sign-off before deploying breaking changes.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml