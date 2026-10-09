---
name: "system-design"
category: "platform"
maturity: "stable"
version: "1"
description: "Design whole systems — components, data flow, scaling, reliability, and trade-offs — with clear assumptions and failure boundaries."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Components, data flow, trade-offs, failure modes, and operational assumptions are explicit."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "plan"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/system-design.json"
diataxis: "how-to"
tags: ["platform/system-design"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: goals, users, scale, constraints, data model, integration points, and operational requirements.
- Output: system design proposal with components, data flow, APIs, storage, trade-offs, risks, and validation plan.
- Scope: make assumptions visible and avoid pretending a single architecture is optimal for every constraint.
- Rule: make assumptions visible and avoid pretending a single architecture is optimal for every constraint.
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

Emit `SystemDesignArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/system-design/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# System Design

Use this skill when shaping an end-to-end system, comparing architectures, defining service boundaries, or explaining scaling and reliability trade-offs.


## Rules

- Rule: start from requirements, scale, reliability target, and constraints.
- Rule: define components by responsibility and data ownership.
- Rule: trace critical reads, writes, failures, and recovery paths.
- Rule: compare at least one meaningful alternative for major architecture choices.
- Rule: include observability, deployment, migration, and operational ownership.

## Steps

1. Clarify goals, non-goals, users, scale, and constraints.
2. Define domain concepts, data flow, components, and external integrations.
3. Choose storage, APIs, queues, caching, and consistency model where relevant.
4. Analyze failure modes, scaling limits, security boundaries, and operations.
5. Compare alternatives and document trade-offs.
6. Define validation, rollout, and open questions.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml