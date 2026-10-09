---
name: "nextjs"
category: "frontend"
maturity: "stable"
version: "1"
description: "Shape Next.js projects around routes, server/client seams, and data flow that stay deep rather than tangled."
capabilities: ""
inputs:
  - type: object
    description: Next.js brief, route map, rendering constraints, and deployment target.
outputs:
  - type: object
    description: Next.js seam proposal, route guidance, server/client split guidance, and data-flow diagram.
sideEffects: []
dependencies: []
stopCondition: "Shape Next complete; artifact saved; completion criteria checked."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "frontend"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/nextjs.json"
diataxis: "how-to"
tags: ["frontend"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: Next.js brief, route map, and rendering constraints.
- Output: a Next.js seam proposal, route guidance, and server/client split guidance.
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

Emit `NextjsArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/nextjs/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Next.js

Use this skill when the project is built on Next.js and the route tree or rendering model needs to be shaped with intent. Record the execution traceId and link the artifact to the originating issue for review replay. Keep the route surface small, the server/client split explicit, and the data flow easy to reason about.


## Why

Explicit server/client seams and route boundaries keep Next.js apps from devolving into tangled data fetching and hydration bugs.

## Steps

1. Identify the primary user path and route shape.
2. Decide the server/client split at the seam.
3. Note any data-fetching or rendering constraints.
4. Describe the smallest route structure that still fits the flow.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml