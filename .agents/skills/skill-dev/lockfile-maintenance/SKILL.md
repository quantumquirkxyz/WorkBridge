---
name: "lockfile-maintenance"
category: "skill-dev"
maturity: "stable"
version: "1"
description: "Maintain the skills lockfile by detecting missing, stale, extra, or mismatched skill entries and updating hashes only after the corresponding SKILL.md files are resolved."
capabilities: ""
outputs: ""
sideEffects: ""
dependencies: ""
stopCondition: "Lockfile entries match the current skill tree or every drift item has a stated blocker and recommended repair."
risk: "low"
trustTier: "2"
maxIterations: "5"
promptVersion: "2.0"
artifactType: "skill-dev"
modelTier: "fast"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/lockfile-maintenance.json"
diataxis: "how-to"
tags: ["skill-dev"]
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

Emit `LockfileMaintenanceArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/lockfile-maintenance/{identifier}.json`
- Markdown view: same filename with `.md` extension


## 
## 
## Rules

- Rule: enumerate canonical `SKILL.md` files from `.agents/skills` before changing lock data.
- Rule: distinguish content hash drift from path drift, missing entries, and deleted skill entries.
- Rule: update hashes from the exact bytes currently in each `SKILL.md`; do not hash rendered excerpts or generated summaries.
- Rule: remove lock entries only when the corresponding skill path is intentionally absent and no symlink still points to it.
- Rule: preserve existing lockfile schema, indentation, and stable ordering unless the repository's maintenance script defines a different order.
- Rule: prefer `scripts/update-lockfile.mjs` for canonical bundle lock refreshes; inspect its dry-run output before committing changes.
- Rule: run the repository validator after lock updates and report the command, exit status, and any warning.
- Rule: if a lock update follows skill edits, include both the edited skill names and the resulting lock entries in the summary.

## Workflow

1. Read the lockfile and list canonical skill files.
2. Compare lock entries to the filesystem by skill name, path, and hash.
3. Classify drift as missing entry, stale hash, extra entry, moved skill, duplicate name, or malformed metadata.
4. Apply the smallest lockfile change that reconciles the intended tree.
5. Validate the full skill bundle using the repository's available validation commands.
6. Summarize every lockfile mutation and cite remaining drift, if any.

## Script

Use `scripts/update-lockfile.mjs` from this skill directory to reconcile the canonical skill tree with `skills-lock.json`.

```bash
node .agents/skills/skill-dev/lockfile-maintenance/scripts/update-lockfile.mjs --dry-run
node .agents/skills/skill-dev/lockfile-maintenance/scripts/update-lockfile.mjs --write
```

The dry run reports added, updated, and removed lock entries without changing files. The write mode preserves the lockfile schema, sorts skill names, and writes hashes from the exact current `SKILL.md` bytes.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml