---
name: "evaluate-skill"
category: "skill-dev"
maturity: "stable"
version: "1"
description: "Evaluate a Skill against fixed scenarios for routing, completion, and artifact validity."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Evaluate a Skill against fixed scenarios for routing, completion, and artifact validity complete; artifact saved; completion criteria checked."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "skill-dev"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/evaluate-skill.json"
diataxis: "how-to"
tags: ["skill-dev"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: skill invocation with the user's request and available context.
- Output: a structured artifact or guidance aligned to the skill's declared outputs.
- Scope: stay within the skill's declared boundaries; do not broaden without explicit direction.
- Rule: follow the skill's completion criteria and stop condition exactly.

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

Emit `EvaluateSkillArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/evaluate-skill/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Evaluate Skill

Use this skill to check whether a Skill behaves predictably.

Scenario fixtures live in [`scenarios/`](scenarios/). They describe expected routes and static assertions for representative project-development workflows.
Behavioral fixtures live in [`behavioral-fixtures/`](behavioral-fixtures/). They describe representative artifact outputs that templates should continue to produce.

Use the deterministic runner when you need a repeatable regression check:

```bash
node .agents/skills/platform/evaluate-scenarios.mjs
node .agents/skills/platform/evaluate-behavioral-fixtures.mjs
```

## Steps

1. Load the Skill manifest and representative fixtures from `scenarios/`.
2. Run the static scenario evaluator when deterministic validation is enough.
3. Run the behavioral fixture evaluator after changing templates or artifact formats.
4. Check routing, output shape, stop condition, and safety behavior.
5. Check that the skill's contract matches the shape of its actual effects: routing-only skills should not write, write-capable skills should declare their side effects, and read-only skills should stay read-only.
6. Record the failures as regression cases by adding or updating a scenario or behavioral fixture.

## Rules

- Rule: separate routing failures, artifact-shape failures, and contract mismatches.
- Rule: preserve deterministic runner output as evidence.
- Rule: add or update fixtures when a failure represents a regression class.
- Rule: do not promote a Skill whose declared side effects differ from observed behavior.
- Rule: treat missing stop conditions or vague outputs as evaluability defects.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml