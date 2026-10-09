---
name: "ux-accessibility"
category: "ux"
maturity: "stable"
version: "1"
description: "Design accessible UX — keyboard navigation, focus order, semantics, contrast, and assistive-technology support — with inclusive interaction patterns."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Task-level accessibility barriers and flow-level remediations are explicit."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "ux"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/ux-accessibility.json"
diataxis: "how-to"
tags: ["ux"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: user journey, tasks, states, constraints, and accessibility requirements or known barriers.
- Output: flow-level accessibility guidance with barriers, interaction changes, and validation criteria.
- Scope: evaluate whether users can complete the task, recover from errors, and understand state changes.
- Rule: evaluate whether users can complete the task, recover from errors, and understand state changes.
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

Emit `UxAccessibilityArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/ux-accessibility/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# ux-accessibility

Use this skill when reviewing or designing the accessibility of a user journey, not just individual UI components.


## Rules

- Rule: inspect the whole task path, including setup, errors, loading, confirmation, and recovery.
- Rule: preserve multiple input modes: keyboard, touch, pointer, voice, and assistive technology where relevant.
- Rule: make state changes perceivable without relying on color, motion, or spatial memory alone.
- Rule: include cognitive load, reading clarity, timing pressure, and error prevention.
- Rule: define validation in terms of task completion, not only individual WCAG checks.

## Steps

1. Map the journey from entry point to completion and recovery.
2. Identify users, assistive technologies, input modes, and environmental constraints.
3. Review navigation, focus order, labels, feedback, errors, timing, and confirmation.
4. Rank barriers by task impact and likelihood.
5. Recommend flow, content, and component changes.
6. Define validation tasks and acceptance criteria.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml