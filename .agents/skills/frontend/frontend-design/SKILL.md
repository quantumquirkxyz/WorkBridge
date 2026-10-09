---
name: "frontend-design"
category: "frontend"
maturity: "stable"
version: "1"
description: "Shape frontend work into a clear visual system, interaction model, and implementation seam — with explicit state and motion boundaries."
capabilities: ""
inputs:
  - type: object
    description: UI brief, current interface, brand context, and accessibility constraints.
outputs:
  - type: object
    description: Frontend seam proposal, interaction model, visual system guidance, and motion boundaries.
sideEffects: []
dependencies: []
stopCondition: "Shape frontend work into a clear visual system, interaction model, and implementation seam complete; artifact saved; completion criteria checked."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "plan"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/frontend-design.json"
diataxis: "how-to"
tags: ["frontend"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: UI brief, current interface, and design context.
- Output: a frontend seam proposal, interaction model, and visual system guidance.
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

Emit `FrontendDesignArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/frontend-design/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Frontend Design

Use this skill when the project needs a clear frontend shape before implementation. Record the execution traceId and link the artifact to the originating issue for review replay. It should decide what the user sees first, which interactions matter, and where the seam should sit so the rest of the UI can stay deep rather than shallow.


## Why

Frontend design is the interface contract. Making it explicit prevents one-off styling from diverging and keeps motion and accessibility consistent.

## Steps

1. Read the minimum context needed to understand the interface and brand constraints.
2. Identify the primary user path and the seam where it becomes observable.
3. Shape the interaction model around that seam.
4. Describe the visual direction in implementation-ready terms.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml