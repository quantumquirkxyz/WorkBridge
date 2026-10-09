---
name: "grill"
category: "routing"
maturity: "stable"
version: "1"
description: "Alias for the quirk grilling flow. Use when the user says "grill" and wants a relentless interview to sharpen a plan, decision, or design."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Alias for the quirk grilling flow complete; structured result returned; completion criteria checked."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "routing"
modelTier: "router"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/grill.json"
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

Return `GrillArtifact` as structured output in the current response. Do not write local artifact files unless the user explicitly asks for an export.


# 
# 
# Grill

Run the `grilling` primitive as the stable quirk entrypoint named `grill`.

Use this alias when the user asks for `grill` specifically. Keep the behavior identical to `grilling`: ask one question at a time, recommend an answer for each question, inspect discoverable facts directly, and do not act on the plan until the user confirms the shared understanding is complete.

## Rules

- Rule: preserve behavior parity with `grilling`.
- Rule: use this skill only as the stable alias entrypoint.
- Rule: keep the session interrogative until the user asks to implement, document, or execute.
- Rule: summarize the sharpened premise before handing off to another skill.

## Completion

- the skill's completion criteria are explicitly checked
- the structured result is returned and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml