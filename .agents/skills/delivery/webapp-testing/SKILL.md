---
name: "webapp-testing"
category: "delivery"
maturity: "stable"
version: "1"
description: "Choose the right test seam for a web app and describe how to verify it at unit, integration, and end-to-end levels."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Choose the right test seam for a web app and describe how to verify it at unit, integration, and end-to-end levels complete; structured result returned; completion criteria checked."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "test-strategy"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/webapp-testing.json"
diataxis: "how-to"
tags: ["delivery"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: web app surface, behavior under test, and test stack.
- Output: a test seam recommendation, verification plan, and coverage boundaries.
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

Return `WebappTestingArtifact` as structured output in the current response. Do not write local artifact files unless the user explicitly asks for an export.


# 
# 
# Webapp Testing

Use this skill when the project needs guidance on how to test a frontend or full-stack web app. The goal is to select the right seam and keep each test level honest about what it proves.


## Steps

1. Identify the public behavior that needs proof.
2. Map that behavior to the smallest useful seam.
3. Decide which level owns the check: unit, integration, or end-to-end.
4. Define the boundary so tests do not overreach into internals.

## Completion

- the skill's completion criteria are explicitly checked
- the structured result is returned and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml