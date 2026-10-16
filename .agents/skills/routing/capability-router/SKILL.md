---
name: "capability-router"
category: "routing"
maturity: "stable"
version: "1"
description: "Route work to the best matching Skill using declared capabilities and compatibility — with explicit selection rules."
license: "MIT"
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Route work to the best matching Skill using declared capabilities and compatibility complete; structured result returned; completion criteria checked."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "plan"
modelTier: "router"
evaluators: ["behavioral", "regression"]
fixturesPath: ""
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
- Rule: documented standards override defaults; explicit project rules take precedence.
- Rule: if blocked by missing context or dependencies, surface the blocker before proceeding.
- Rule: exact and keyword matches always outrank graph neighborhood activation; the graph re-ranks candidates and never replaces direct matching.
- Rule: record in the CapabilityRouterArtifact which candidates came from keyword/seed matching and which were activated by the graph neighborhood.

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

Return `CapabilityRouterArtifact` as structured output in the current response. Do not write local artifact files unless the user explicitly asks for an export.


# 
# 
# Capability Router

Use this skill to choose the right Skill from the registry instead of relying on memory.


## Steps

1. Parse the task intent and required artifact type.
2. Match against declared capabilities and side effects.
3. Ask `skill-graph.mjs` to rank the candidate set: `node .agents/skills/platform/skill-graph.mjs rank "<query>" --json`, or read the persisted graph at `.agents/skills/platform/graph/skill-graph.json`.
4. Prefer the thinnest Skill that can finish the work; use neighborhood activation only to break near-ties and to pull declared prerequisites.
5. Fall back to a human-readable rationale when multiple Skills fit.

## Completion

- the skill's completion criteria are explicitly checked
- the structured result is returned and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml