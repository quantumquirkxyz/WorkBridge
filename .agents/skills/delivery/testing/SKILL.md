---
name: "testing"
category: "delivery"
maturity: "stable"
version: "1"
description: "Shape the test strategy for a project so behavior is verified at the right seams and at the right level."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Shape the test strategy for a project so behavior is verified at the right seams and at the right level complete; structured result returned; completion criteria checked."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "test-strategy"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/testing.json"
diataxis: "how-to"
tags: ["delivery"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: testing brief, system surface, and test stack.
- Output: a test strategy, seam guidance, and coverage boundaries.
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

Return `TestingArtifact` as structured output in the current response. Do not write local artifact files unless the user explicitly asks for an export.


# 
# 
# Testing

Use this skill when the project needs a testing strategy beyond a single feature slice. It should make the seams, levels, and coverage boundaries explicit so tests stay behavior-focused and maintainable.


## Steps

1. Identify the public behavior that needs protection.
2. Choose the smallest seam that proves that behavior.
3. Assign the right test level to each behavior slice.
4. State what is intentionally not covered.

## Completion

- the skill's completion criteria are explicitly checked
- the structured result is returned and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml