---
name: "db-migrations"
category: "db"
maturity: "stable"
version: "1"
description: "Plan database migrations — schema changes, backfills, compatibility windows, and rollback strategy — with explicit application and data safety checks."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "The migration sequence, compatibility window, validation, and rollback posture are explicit."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "db"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/db-migrations.json"
diataxis: "how-to"
tags: ["db"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: current schema, target schema, application readers/writers, data volume, deployment process, and rollback constraints.
- Output: phased migration plan with forward/backward compatibility, validation queries, and rollback posture.
- Scope: avoid single-step migrations that require app and database changes to land atomically unless downtime is explicitly accepted.
- Rule: avoid single-step migrations that require app and database changes to land atomically unless downtime is explicitly accepted.
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

Emit `DbMigrationsArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/db-migrations/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# db-migrations

Use this skill when changing a database schema, moving data, adding constraints, backfilling fields, or coordinating application and database compatibility.


## Rules

- Rule: separate expand, backfill, switch reads/writes, contract, and cleanup phases.
- Rule: preserve compatibility across at least one deploy window unless the system can be stopped safely.
- Rule: make backfills resumable, observable, and bounded by batch size.
- Rule: validate data correctness before dropping old columns, indexes, or paths.
- Rule: state whether rollback is schema rollback, application rollback, data repair, or forward fix.

## Steps

1. Map current readers, writers, constraints, indexes, triggers, and data volume.
2. Define the target schema and compatibility hazards.
3. Sequence the migration into reversible or forward-safe phases.
4. Plan backfill mechanics, throttling, monitoring, and retry behavior.
5. Write validation checks for counts, nullability, referential integrity, and application behavior.
6. Document rollback or forward-fix actions for each phase.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml