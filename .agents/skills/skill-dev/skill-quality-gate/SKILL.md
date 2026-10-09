---
name: "skill-quality-gate"
category: "skill-dev"
maturity: "stable"
version: "1"
description: "Run and interpret the skill bundle quality gate across schema, lockfile, semantic, routing, placeholder, rule, metadata, and side-effect checks before promotion or publication."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: ""
stopCondition: "Quality gate commands are executed or blocked with reasons, findings are separated into blockers and warnings, and release readiness is stated."
risk: "low"
trustTier: "1"
maxIterations: "5"
promptVersion: "2.0"
artifactType: "skill-dev"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/skill-quality-gate.json"
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

Emit `SkillQualityGateArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/skill-quality-gate/{identifier}.json`
- Markdown view: same filename with `.md` extension


## 
## 
## Rules

- Rule: run the broadest available repository gate before claiming a skills release is clean.
- Rule: separate schema failures, lockfile drift, semantic warnings, routing issues, and documentation quality problems.
- Rule: treat placeholder bodies, generic metadata, missing explicit rules, and mismatched side effects as release risks even if parsing succeeds.
- Rule: report exact command names and whether each command passed, failed, or was skipped.
- Rule: when a command is unavailable, inspect nearby platform scripts before concluding the gate cannot run.
- Rule: avoid declaring success from a single narrow validator when changed skills affect lockfiles, symlinks, or generated registries.
- Rule: recommend fixes in priority order: correctness blockers, routing defects, unsafe side effects, quality debt, then optional cleanup.
- Rule: use `references/quality-gate-report-template.md` for release or handoff summaries.
- Rule: explain validator count differences using `references/validator-counts.md` before treating them as failures.

## Workflow

1. Identify changed skills and metadata files from git status or the user's scope.
2. Discover repository validation scripts under the skills platform directory.
3. Run structural, lockfile, semantic, and all-in-one gates when available.
4. Inspect output for warnings that should be promoted to blockers due to the requested release or promotion context.
5. If failures occur, map each failure to the responsible skill path and likely repair.
6. Return a compact readiness decision: ready, ready with warnings, or blocked.

## References

- `references/quality-gate-report-template.md` - compact release-readiness report format.
- `references/validator-counts.md` - explanation of expected count differences between structural and semantic checks.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml