---
name: "design-system"
category: "frontend"
maturity: "stable"
version: "1"
description: "Define and evolve reusable UI tokens, components, and usage rules as a coherent system."
capabilities: ""
inputs:
  - type: object
    description: UI requirements, component inventory, brand context, and accessibility constraints.
inputs:
  - type: object
    description: UI requirements, component inventory, brand context, and accessibility constraints.
outputs:
  - type: object
    description: Token definitions, component guidance, and usage rules.
sideEffects: []
dependencies: []
stopCondition: "Define and evolve reusable UI tokens, components, and usage rules as a coherent system complete; artifact saved; completion criteria checked."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "plan"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/design-system.json"
diataxis: "how-to"
tags: ["frontend"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: UI requirements, component inventory, and brand context.
- Output: token guidance, component guidance, and usage rules.
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

Emit `DesignSystemArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/design-system/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Design System

Use this skill when UI work starts to repeat and needs a shared system rather than one-off styling. It should define the reusable tokens, components, and usage rules that keep the frontend coherent as it grows.


## Why

A design system prevents drift by making the shared token and component decisions explicit and reviewable. Without it, teams repeat patterns, diverge on spacing and color, and accessibility regresses silently.

## Steps

1. Find repeated UI patterns and naming collisions.
2. Define the minimum token set that carries the brand.
3. Identify which components should be shared and which should stay local.
4. Write the rules that keep the system coherent over time. Record the design decision traceId and link the artifact to the originating issue so reviewers can replay the rationale.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml