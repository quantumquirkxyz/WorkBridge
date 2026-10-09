---
name: "skill-dependency-graph"
category: "skill-dev"
maturity: "stable"
version: "1"
description: "Build a dependency graph that exposes central Skills, cycles, and unnecessary coupling — use when analyzing Skill modularity."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Build a dependency graph that exposes central Skills, cycles, and unnecessary coupling complete; artifact saved; completion criteria checked."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "skill-dev"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/skill-dependency-graph.json"
diataxis: "how-to"
tags: ["skill-dev"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: the canonical Skills directory.
- Output: Mermaid or JSON graph, cycle list, central Skills, and modularity findings.
- Scope: analyze declared dependencies only; do not rewrite Skill contracts.
- Rule: analyze declared dependencies only; do not rewrite Skill contracts.
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

Emit `SkillDependencyGraphArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/skill-dependency-graph/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Skill Dependency Graph


## Rules

- Rule: analyze declared dependencies, not informal mentions, unless the task explicitly asks for soft links.
- Rule: treat cycles as review findings until proven intentional.
- Rule: distinguish central reusable primitives from accidental coupling.
- Rule: recommend dependency removal only when an alternate contract is clear.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml