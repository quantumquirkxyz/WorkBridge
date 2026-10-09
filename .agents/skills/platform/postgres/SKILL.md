---
name: "postgres"
category: "platform"
maturity: "stable"
version: "1"
description: "Shape PostgreSQL schema and query decisions — so the data model stays durable and reviewable."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Shape PostgreSQL schema and query decisions complete; artifact saved; completion criteria checked."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "platform"
modelTier: "router"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/postgres.json"
diataxis: "how-to"
tags: ["platform"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: postgres brief, data model, and persistence constraints.
- Output: schema guidance, query guidance, and data durability notes.
- Scope: stay within the skill's declared boundaries; do not broaden without explicit direction.
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

Emit `PostgresArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/postgres/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Postgres

Use this skill when PostgreSQL is the persistence layer and the schema or query shape matters. It should make the data model durable and the query seam explicit so changes can be migrated safely.


## Steps

1. Identify the persisted concepts and their boundaries.
2. Decide what belongs in schema versus derived data.
3. Note the query and migration constraints.
4. Describe the durability tradeoffs clearly.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml