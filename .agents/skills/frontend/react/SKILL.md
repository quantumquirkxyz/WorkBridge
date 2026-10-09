---
name: "react"
category: "frontend"
maturity: "stable"
version: "1"
description: "Design React component structure and state seams — with composability, testability, and clear data flow."
capabilities: ""
inputs:
  - type: object
    description: React brief, component tree, state shape, and interaction requirements.
outputs:
  - type: object
    description: React seam proposal, component guidance, state boundary guidance, and test hooks.
sideEffects: []
dependencies: []
stopCondition: "Design React component structure and state seams complete; artifact saved; completion criteria checked."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "frontend"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/react.json"
diataxis: "how-to"
tags: ["frontend"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: React brief, component tree, and state shape.
- Output: a React seam proposal, component guidance, and state boundary guidance.
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

Emit `ReactArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/react/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# React

Use this skill when React components or state need to be shaped deliberately. Record the execution traceId and link the artifact to the originating issue for review replay. Keep the component graph shallow where possible, and make the state seam explicit so the UI remains testable and refactor-friendly.


## Why

A clean component seam keeps the UI refactor-friendly and testable. Without it, state leaks across boundaries and changes ripple unpredictably.

## Steps

1. Identify the primary interaction path.
2. Decide which state is local and which state must be lifted.
3. Shape the component graph around the seam.
4. Describe the boundaries that make the UI easy to test.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml