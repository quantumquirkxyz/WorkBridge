---
name: "workflow-fixture-author"
category: "skill-dev"
maturity: "stable"
version: "1"
description: "Author deterministic scenario and behavioral fixtures for skills so routing, contracts, outputs, side effects, and refusal boundaries can be tested before promotion."
capabilities: ""
outputs: ""
sideEffects: ""
dependencies: ""
stopCondition: "Fixtures cover the requested skill behavior and either pass the relevant validator or list exact follow-up fixes."
risk: "low"
trustTier: "2"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "authentication"
modelTier: "fast"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/workflow-fixture-author.json"
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

Emit `WorkflowFixtureAuthorArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/workflow-fixture-author/{identifier}.json`
- Markdown view: same filename with `.md` extension


## 
## 
## Rules

- Rule: read the target skill contract before writing fixtures so expected behavior matches declared inputs, outputs, side effects, and stop condition.
- Rule: include at least one normal path and one boundary or refusal path for any skill that performs mutations or external coordination.
- Rule: make assertions deterministic; avoid expectations that depend on current dates, external network state, or model style unless they are explicitly controlled.
- Rule: fixtures should test observable behavior, not the private chain of reasoning used to reach it.
- Rule: preserve existing fixture formats and naming conventions.
- Rule: when a fixture encodes a side effect, assert both the allowed operation and the condition that makes it safe.
- Rule: run or identify the nearest validator after adding fixtures and report failures without diluting the test.
- Rule: start scenario fixtures from `references/scenario-fixture-template.json` unless an existing neighboring fixture is more specific.
- Rule: start behavioral fixtures from `references/behavioral-fixture-template.md` and replace every placeholder before validation.

## Workflow

1. Inspect the target skill and nearby existing fixtures to infer naming, schema, and assertion style.
2. Derive fixture coverage from the skill's contract, rules, dependencies, and completion criteria.
3. Draft scenarios for happy path, ambiguous input, unsafe mutation, and completion evidence as appropriate.
4. Draft behavioral expectations that forbid placeholders and require exact sections or fields that matter.
5. Add or update fixture files in the correct location.
6. Run the relevant fixture validator or explain why it cannot run locally.
7. Summarize coverage added, validation result, and remaining gaps.

## References

- `references/scenario-fixture-template.json` - scenario fixture skeleton for route, phrase, side-effect, and reference checks.
- `references/behavioral-fixture-template.md` - behavioral fixture skeleton for required sections and forbidden placeholder checks.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml