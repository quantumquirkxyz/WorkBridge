---
name: "project-development"
category: "project"
maturity: "stable"
version: "1"
description: "Evaluate a project's shape, agent fit, and architectural starting point — before the main workflow begins."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Evaluate a project's shape, agent fit, and architectural starting point complete; structured result returned; completion criteria checked."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "pull-request"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/project-development.json"
diataxis: "how-to"
tags: ["project"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: project brief, repo state, and target stack.
- Output: a project fit assessment, a project shape classification, and an initial flow recommendation.
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
| What evidence proves it is done? | Completion criteria met, structured result returned, validation passed |
| What risk remains? | Subjective judgment calls, missing context, or external dependency failures


## Artifact

Return `ProjectDevelopmentArtifact` as structured output in the current response. Do not write local artifact files unless the user explicitly asks for an export.


# 
# 
# Project Development

Use this skill to decide what kind of project you are dealing with before the workflow commits to a path. A standard project can still be unusual in shape: batch pipeline, agentic system, interactive app, toolchain, or mixed stack. The point of this skill is to classify the shape and choose the right first seam, not to design the whole system.


## Steps

1. Read the minimum repo context needed to understand the stack and current constraints.
2. Classify the project shape: interactive app, batch pipeline, agentic system, library, backend service, or hybrid.
3. Identify whether the first useful seam is in UI, API, data, execution, or governance.
4. Recommend the next workflow skill and explain why it is the thinnest safe path.

## Completion

- the skill's completion criteria are explicitly checked
- the structured result is returned and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml