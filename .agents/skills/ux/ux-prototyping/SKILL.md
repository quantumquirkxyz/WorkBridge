---
name: "ux-prototyping"
category: "ux"
maturity: "stable"
version: "1"
description: "Prototype user experiences — wireframes, interactive mockups, and rapid validation — with explicit experiment goals and iteration criteria."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Prototype goal, fidelity, validation method, and iteration criteria are explicit."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "pull-request"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/ux-prototyping.json"
diataxis: "how-to"
tags: ["ux"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: product question, target users, workflow, uncertainty, constraints, and available validation time.
- Output: prototype plan with fidelity, tasks, feedback method, success criteria, and iteration plan.
- Scope: prototype only the uncertainty that matters; avoid making high-fidelity artifacts for low-fidelity questions.
- Rule: prototype only the uncertainty that matters; avoid making high-fidelity artifacts for low-fidelity questions.
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

Emit `UxPrototypingArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/ux-prototyping/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# ux-prototyping

Use this skill when planning or reviewing a UX prototype meant to answer a question about flow, usability, comprehension, layout, or interaction behavior.


## Rules

- Rule: state the hypothesis or design question before choosing tools or fidelity.
- Rule: choose fidelity based on what must be learned, not what looks impressive.
- Rule: define user tasks and success signals before collecting feedback.
- Rule: separate observed behavior from participant preference.
- Rule: decide in advance what evidence will cause iteration, abandonment, or implementation.

## Steps

1. Identify the decision the prototype must inform.
2. Define audience, scenario, core task, and risky assumptions.
3. Choose fidelity: sketch, wireframe, clickable mock, coded prototype, or service simulation.
4. Build the smallest artifact that can test the assumption.
5. Plan feedback collection, prompts, metrics, and note-taking.
6. Summarize findings and next iteration criteria.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml