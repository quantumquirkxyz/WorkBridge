---
name: "grill-me"
category: "routing"
maturity: "stable"
version: "1"
description: "A relentless interview to sharpen a plan or design."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "A relentless interview to sharpen a plan or design complete; structured result returned; completion criteria checked."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "routing"
modelTier: "router"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/grill-me.json"
diataxis: "how-to"
tags: ["routing"]
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
| What evidence proves it is done? | Completion criteria met, structured result returned, validation passed |
| What risk remains? | Subjective judgment calls, missing context, or external dependency failures


## Artifact

Return `GrillMeArtifact` as structured output in the current response. Do not write local artifact files unless the user explicitly asks for an export.


## 
## 
## Rules

- Rule: ask one pointed question at a time.
- Rule: recommend a likely answer after each question so the user can accept, reject, or refine quickly.
- Rule: keep pressure on assumptions, evidence, constraints, and hidden trade-offs.
- Rule: do not execute the plan being grilled until the user confirms the shared understanding is complete.

## Steps

1. Restate the plan or design being stress-tested.
2. Identify the riskiest assumption or missing decision.
3. Ask one question with a recommended answer.
4. Incorporate the user's answer and continue until the plan is coherent or blocked.
5. Summarize the sharpened plan, unresolved risks, and next action.

## Completion

- the skill's completion criteria are explicitly checked
- the structured result is returned and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml