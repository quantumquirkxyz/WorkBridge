---
name: "qa-automation"
category: "qa"
maturity: "stable"
version: "1"
description: "Design and implement automated test suites — unit, integration, e2e — with proper coverage, maintainability, and CI integration."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Design and implement automated test suites complete; artifact saved; completion criteria checked."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "qa"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/qa-automation.json"
diataxis: "how-to"
tags: ["qa"]
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

Emit `QaAutomationArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/qa-automation/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# qa-automation

Design and implement automated test suites — unit, integration, e2e — with proper coverage, maintainability, and CI integration.

## Goals
- Automate regression tests to enable confident releases
- Choose the right test seam for each scenario
- Keep tests fast, reliable, and deterministic
- Integrate testing into the CI/CD pipeline


## Test Pyramid

```
       /\
      /e2e\        ← Few, slow, high confidence
     /------\
    /integr. \    ← Some, medium speed
   /----------\
  /  unit tests \ ← Many, fast, isolated
 /______________\
```

## Steps

1. **Audit the codebase** — entry points, data flows, risk areas
2. **Define the test pyramid** — unit/integration/e2e ratio
3. **Choose testing tools** — match to language and framework
4. **Write tests** — start with happy paths, add edge cases
5. **Make tests reliable** — eliminate flakiness, mock external deps
6. **Integrate with CI** — gate on test results, report coverage
7. **Maintain** — review test suite regularly, remove dead tests

## Rules

- Rule: choose the test seam from risk and feedback speed, not from tooling habit.
- Rule: keep unit tests deterministic and integration tests explicit about external boundaries.
- Rule: make flaky tests actionable by fixing isolation, data setup, or timing assumptions.
- Rule: gate CI on meaningful failures and preserve useful diagnostics.
- Rule: review tests as product behavior changes so coverage does not become stale ceremony.

## References
- `../../delivery/tdd/SKILL.md` — test-first development
- `../../delivery/testing/SKILL.md` — test strategy
- `../../delivery/webapp-testing/SKILL.md` — web app testing patterns
- `../../devops/devops-ci-cd-pipeline/SKILL.md` — CI integration

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml