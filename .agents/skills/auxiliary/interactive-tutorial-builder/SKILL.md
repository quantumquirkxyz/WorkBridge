---
name: "interactive-tutorial-builder"
category: "auxiliary"
maturity: "stable"
description: "Generate a focused tutorial with goals, exercise inputs, expected outputs, and checkpoints for any Skill; use when teaching or onboarding someone to a Skill."
version: "1"
capabilities: ""
inputs: ""
outputs: ""
dependencies: ""
sideEffects: []
stopCondition: "The learner has a runnable exercise and a checkable checkpoint derived from the target Skill contract."
risk: "low"
trustTier: "2"
promptVersion: "2.0"
artifactType: "auxiliary"
modelTier: "fast"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/interactive-tutorial-builder.json"
diataxis: "how-to"
tags: ["auxiliary"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: a Skill name and learner context.
- Output: learning goals, exercise, expected outputs, checkpoint, and response space.
- Scope: generate instructional scaffolding; the learner remains responsible for executing the Skill.
- Rule: generate instructional scaffolding; the learner remains responsible for executing the Skill.
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

Emit `InteractiveTutorialBuilderArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/interactive-tutorial-builder/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Interactive Tutorial Builder


## Rules

- Rule: derive learning goals from the target Skill's actual contract, not from its name alone.
- Rule: keep the exercise small enough to complete in one sitting.
- Rule: include expected output shape and at least one checkable checkpoint.
- Rule: preserve the target Skill's boundaries and side-effect policy.

## Steps

1. Read the target Skill contract and identify the learner's context.
2. Generate the tutorial scaffold with `skill-lab.mjs tutorial`.
3. Adapt the scenario, exercise input, and checkpoint to the learner.
4. Add evidence requirements and common failure hints.
5. Verify that the exercise still teaches the target Skill rather than a neighboring skill.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml