---
name: "cs-data-structures"
category: "cs"
maturity: "stable"
version: "1"
description: "Design and analyze data structures — arrays, trees, heaps, hash tables, graphs, and balanced variants — with operation costs and invariants."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "The recommended structure, invariants, and operation costs are explicit."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "data"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/cs-data-structures.json"
diataxis: "how-to"
tags: ["cs"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: access patterns, operations, constraints, and expected data size.
- Output: recommended data structure, operation complexity, invariants, and failure modes.
- Scope: prefer a simpler structure when it satisfies the workload and keeps invariants easier to maintain.
- Rule: prefer a simpler structure when it satisfies the workload and keeps invariants easier to maintain.
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

Emit `CsDataStructuresArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/cs-data-structures/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# cs-data-structures

Use this skill when choosing, designing, or reviewing a data structure for a specific workload, API, or algorithm.


## Rules

- Rule: start from required operations, not from a favorite structure.
- Rule: state invariants that must hold after every mutation.
- Rule: compare at least one plausible alternative when the choice is not obvious.
- Rule: include memory overhead and locality when they materially affect the design.
- Rule: treat hash behavior, balancing, and ordering guarantees as explicit assumptions.

## Steps

1. List required operations and query/update frequency.
2. Identify constraints: ordering, duplicates, concurrency, memory, persistence, and latency.
3. Select candidate structures and compare operation costs.
4. Define invariants, mutation rules, and edge cases.
5. Recommend the structure and explain rejected alternatives.
6. Describe tests or proofs that would catch invariant violations.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml