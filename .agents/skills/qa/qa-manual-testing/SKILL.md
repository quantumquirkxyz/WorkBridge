---
name: "qa-manual-testing"
category: "qa"
maturity: "stable"
version: "1"
description: "Perform manual test sessions — exploratory checks, edge cases, accessibility, and user-visible regressions — with explicit reproduction notes."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Tested paths, environment, findings, and residual risks are documented."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "test-strategy"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/qa-manual-testing.json"
diataxis: "how-to"
tags: ["qa"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: feature or bug scope, environment, build/version, target users, and known risk areas.
- Output: test charter, executed paths, findings, reproduction notes, and residual risk.
- Scope: report observed behavior and evidence without assuming root cause unless independently verified.
- Rule: report observed behavior and evidence without assuming root cause unless independently verified.
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

Emit `QaManualTestingArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/qa-manual-testing/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# qa-manual-testing

Use this skill when manually testing a feature, reproducing a user-visible issue, or running an exploratory session that needs evidence and coverage notes.


## Rules

- Rule: record environment, account state, data setup, and build identifier.
- Rule: test the happy path, likely edge cases, and at least one failure path.
- Rule: write findings with expected behavior, actual behavior, steps, and impact.
- Rule: distinguish bugs from usability concerns and open questions.
- Rule: include screenshots, logs, or exact UI text when they materially improve reproducibility.

## Steps

1. Define the test charter and risk areas.
2. Prepare environment, test data, permissions, and device/browser matrix.
3. Execute core workflows before edge cases.
4. Probe boundaries: empty states, invalid input, permission gaps, latency, and navigation.
5. Document findings with reproduction steps and severity rationale.
6. Summarize coverage, untested areas, and follow-up recommendations.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml