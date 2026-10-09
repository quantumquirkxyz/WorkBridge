---
name: "grilling"
category: "routing"
maturity: "stable"
version: "1"
description: "Grill the user relentlessly about a plan, decision, or idea. Use when the user wants to stress-test their thinking, or use docs to sharpen the premise before acting."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Grill the user relentlessly about a plan, decision, or idea complete; structured result returned; completion criteria checked."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "routing"
modelTier: "router"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/grilling.json"
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

Return `GrillingArtifact` as structured output in the current response. Do not write local artifact files unless the user explicitly asks for an export.


## 
## 
## Rules

- Rule: ask exactly one main question at a time.
- Rule: provide a recommended answer with each question so the user has a concrete foil.
- Rule: investigate discoverable facts directly before asking the user.
- Rule: keep decisions with the user, even when facts are discoverable.
- Rule: stop grilling when the plan is coherent enough to act or when a blocker requires outside input.

## Completion

- the skill's completion criteria are explicitly checked
- the structured result is returned and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml