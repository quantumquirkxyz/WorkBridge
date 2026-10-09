---
name: "data-versioning"
category: "data"
maturity: "stable"
version: "1"
description: "Data versioning (DVC, lakeFS, delta tables, snapshotting, reproducibility)."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Versioning strategy saved; branching workflow defined; reproducibility plan documented."
risk: "medium"
trustTier: "3"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "data"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/data-versioning.json"
diataxis: "how-to"
tags: ["data"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: data assets, reproducibility requirements, collaboration model.
- Output: versioning strategy + branching workflow + reproducibility plan.
- Scope: designs versioning; execution requires approval.
- Rule: designs versioning; execution requires approval.
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

Emit `DataVersioningArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/data-versioning/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Data Versioning

Design **data versioning** — DVC, lakeFS, delta tables, snapshotting, and reproducibility.

## Process

### 1. Assess versioning needs
- Datasets: raw, processed, feature, model.
- Frequency of change: static, nightly, streaming.
- Team collaboration: single team, cross-team, external.
- Compliance: audit trail, retention, immutability.

**Completion criterion:** requirements and constraints saved.

### 2. Tool selection
- DVC: Git-like versioning for files and ML pipelines; works with any storage.
- lakeFS: open-source Git-like lakehouse; branch/commit/merge for data lakes.
- Delta Lake: ACID transactions, time travel, schema enforcement on lakes.
- Iceberg / Hudi: alternative table formats with versioning.

**Completion criterion:** tool selection saved with justification.

### 3. Versioning strategy
- Granularity: file-level, table-level, snapshot-level.
- Naming: semantic versioning, timestamped, hash-based.
- Metadata: commit messages, author, timestamp, diff summary.
- Storage: object store (S3, GCS, ADLS) with versioning enabled.

**Completion criterion:** versioning strategy saved.

### 4. Branching and merging
- Branching: dev / staging / prod; experiment branches for ML.
- Merging: conflict resolution, merge commits, cherry-pick.
- CI/CD: validate branches before merge (schema, quality, tests).

**Completion criterion:** branching workflow saved.

### 5. Snapshotting and reproducibility
- Snapshots: point-in-time captures of datasets and code.
- Provenance: link data version to code version, config, environment.
- Rollback: revert to previous snapshot with validation.

**Completion criterion:** snapshot and rollback plan saved.

### 6. Integration with ML pipelines
- Experiment tracking: data version → model version → metrics.
- Feature reproducibility: pin feature dataset version.
- Deployment: promote approved data versions to production.

**Completion criterion:** ML integration design saved.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml