---
name: "skill-testing-framework"
category: "skill-dev"
maturity: "stable"
version: "1"
description: "Validate Skill structure, contracts, dependencies, anti-patterns, and isolated execution — use when checking a Skill before promotion."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Validate Skill structure, contracts, dependencies, anti-patterns, and isolated execution complete; artifact saved; completion criteria checked."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "test-strategy"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/skill-testing-framework.json"
diataxis: "how-to"
tags: ["skill-dev"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: a Skill path and optional sandbox execution request.
- Output: structural findings and, for sandbox Skills, execution evidence and a promotion recommendation.
- Scope: use existing repository validators; do not silently mutate canonical Skills.
- Rule: use existing repository validators; do not silently mutate canonical Skills.
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

Emit `SkillTestingFrameworkArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/skill-testing-framework/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Skill Testing Framework


## Rules

- Rule: run structural validation before behavioral or sandbox validation.
- Rule: treat placeholder bodies and generic outputs as quality risks even when schemas pass.
- Rule: preserve validator output as evidence, but add human interpretation for impact.
- Rule: do not promote a Skill when dependencies, side effects, or stop condition are ambiguous.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml