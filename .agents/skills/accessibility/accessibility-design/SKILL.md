---
name: "accessibility-design"
category: "accessibility"
maturity: "stable"
version: "1"
description: "Design accessible interfaces — semantics, focus management, keyboard flows, contrast, and assistive-technology compatibility — with inclusive interaction patterns."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Accessibility barriers, design decisions, and validation checks are explicit."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "plan"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/accessibility-design.json"
diataxis: "how-to"
tags: ["accessibility"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: user flow, component or screen description, target users, platform constraints, and any accessibility requirements.
- Output: accessibility design guidance with barriers, remediations, validation checks, and residual risks.
- Scope: prioritize user tasks and assistive-technology behavior over checklist-only compliance.
- Rule: prioritize user tasks and assistive-technology behavior over checklist-only compliance.
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

Emit `AccessibilityDesignArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/accessibility-design/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# accessibility-design

Use this skill when designing or reviewing interface behavior for keyboard access, semantics, focus management, contrast, forms, errors, and assistive-technology compatibility.


## Rules

- Rule: define the primary task and interaction sequence before checking individual controls.
- Rule: specify semantic roles, labels, names, states, and relationships.
- Rule: preserve keyboard access, visible focus, logical focus order, and escape paths.
- Rule: treat color, motion, timing, and error recovery as accessibility concerns.
- Rule: include manual validation steps for screen reader and keyboard behavior when possible.

## Steps

1. Identify the task, users, devices, and assistive technologies in scope.
2. Map the interaction path, focus order, and state changes.
3. Review semantics, labels, contrast, motion, target size, and error handling.
4. Identify barriers and rank them by task impact.
5. Recommend design and implementation changes with acceptance checks.
6. Document validation steps and any remaining risks.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml