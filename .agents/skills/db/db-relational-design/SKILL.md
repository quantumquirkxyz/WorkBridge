---
name: "db-relational-design"
category: "skill-dev/sandbox"
maturity: "stable"
version: "1"
description: "Design relational schemas — entities, relations, keys, indexes, constraints — with normalisation, performance, and migration planning."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Artifact complete with schema, indexes, constraints, and migration sequence."
risk: "low"
trustTier: "1"
maxIterations: "8"
promptVersion: "2.0"
artifactType: "plan"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/db-relational-design.json"
diataxis: "how-to"
tags: ["db"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: domain requirements and access patterns.
- Output: schema and migration artifact.
- Scope: schema design and migration plan; no direct DB changes unless user executes scripts separately.
- Rule: schema design and migration plan; no direct DB changes unless user executes scripts separately.
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

Emit `DbRelationalDesignArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/db-relational-design/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Relational DB Design

Design a **relational database schema** — entities, relations, keys, indexes, constraints — with normalisation, query patterns, and migration planning.

## When to use

- The user wants a database schema designed or audited.
- A new feature requires a model change.
- A migration needs sequencing.

## Process

1. Identify entities and relationships (1:1, 1:N, N:M).
2. Normalise to 3NF (at least); denormalise only for read-heavy patterns with justification.
3. Define primary / foreign / composite / candidate keys; state uniqueness constraints.
4. Design indexes for the query workload — primary access path, search patterns, reporting queries.
5. Define constraints: NOT NULL, CHECK, UNIQUE, foreign-key actions (ON DELETE / UPDATE).
6. Migration plan: backward-compatible steps (add column, backfill, change constraint, drop old column / table); rollback steps.
7. Performance: explain plan for critical queries; estimate size and growth.
8. Deliver — artifact: schema diagram (text/table), entity descriptions, index justification, constraints, and migration script sequence.

## Rules

- Rule: model entities, relationships, and cardinality before choosing indexes.
- Rule: normalize by default and denormalize only with workload evidence.
- Rule: use constraints to protect invariants that the database can enforce.
- Rule: design indexes from concrete query patterns and write-cost trade-offs.
- Rule: sequence migrations so application and schema remain compatible.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml