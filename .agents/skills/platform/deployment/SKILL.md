---
name: "deployment"
category: "platform"
maturity: "stable"
version: "1"
description: "Define how a project is built, released, and rolled back — as a safe operational seam."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Define how a project is built, released, and rolled back complete; artifact saved; completion criteria checked."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "deployment"
modelTier: "router"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/deployment.json"
diataxis: "how-to"
tags: ["platform"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: deployment brief, runtime context, and release constraints.
- Output: a deployment seam proposal, release path, rollback guidance, and deployment safety gates.
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

Emit `DeploymentArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/deployment/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Deployment

Use this skill when the project needs a clear release path. It should define how an immutable build artifact moves from repo to runtime, what can fail, and how to recover without guessing. It covers deployment mechanics; release policy and cadence belong to `release-management`.


## Steps

1. Identify the environments, runtime target, artifact identity, and deployment constraints.
2. Describe the build, artifact promotion, configuration, and secret-injection seams.
3. Choose the rollout strategy and define health, readiness, and abort gates.
4. Define rollback, forward-fix, migration compatibility, and failure ownership.
5. State what must be observable and what evidence makes the deployment safe to continue or complete.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml