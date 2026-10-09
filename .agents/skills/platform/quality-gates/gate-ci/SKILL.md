---
name: gate-ci
category: platform
maturity: stable
version: 1
description: Shift-left quality gate that runs on push-to-PR events. Executes the full unit suite, integration tests, contract tests, security scan (semgrep, snyk), performance regression (k6), and enforces an 80% line coverage threshold. Blocks on failure. Max duration: 30min.
capabilities:
  - apply ci quality gate
  - run full test suite
  - produce quality gate artifact
  - validate quality gate completion criteria
outputs:
  - type: object
    name: GateCiArtifact
    properties:
      trigger: { type: string, enum: [push-to-pr] }
      checks:
        type: array
        items:
          type: object
          properties:
            name: { type: string }
            status: { type: string, enum: [passed, failed, skipped] }
            durationMs: { type: integer }
            output: { type: string }
      maxDuration: { type: integer }
      blockOnFailure: { type: boolean }
      coverageThreshold: { type: integer }
      qualityBar: { type: boolean }
      result: { type: string, enum: [completed, blocked, failed] }
    required: [trigger, checks, maxDuration, blockOnFailure, coverageThreshold, result]
sideEffects: []
dependencies: []
stopCondition: Shift-left quality gate that runs on push-to-PR events complete; structured result returned; completion criteria checked.
risk: medium
trustTier: 1
maxIterations: 3
modelTier: fast
promptVersion: "2.0"
artifactType: plan
evaluators:
  - behavioral
  - regression
fixturesPath: .agents/skills/platform/fixtures/behavioral/gate-ci.json
diataxis: how-to
tags: [quality, ci, integration, gate]
compatibility: [implement, publish-open-pr, review-pr]
approvalRequired: false
approvalFor: []
---

## Contract

- Input: push-to-PR event, PR metadata, full repo state.
- Output: `GateCiArtifact` with full suite results, coverage data, and terminal state.
- Scope: CI-level checks — unit, integration, contract, security scan, performance regression, coverage.
- Rule: enforce 80% line coverage threshold for new/modified lines.
- Rule: max duration 30min (30 minutes); fail the gate if exceeded.
- Rule: block on failure; PR cannot be merged until gate passes.

## Provenance

| Question | Answer |
|---|---|
| What is the source of truth? | The push-to-PR event and PR metadata |
| What is in scope? | Full unit suite, integration tests, contract tests, security scan, performance regression, coverage |
| What is explicitly out of scope? | E2E tests, manual QA, production canary |
| Who or what consumes this artifact afterward? | `review-pr` or merge gate |
| What evidence proves it is done? | All checks completed, coverage threshold met, structured result returned |
| What risk remains? | Flaky tests; security scan false positives; performance regression baselines may need tuning |

## Artifact

Return `GateCiArtifact` as structured output in the current response. Do not write local artifact files unless the user explicitly asks for an export.

## Process

### 1. Run full unit suite
Execute the full unit test suite. Capture pass/fail counts, duration, and any failures.

### 2. Run integration tests
Execute integration tests against a test environment. Capture results.

### 3. Run contract tests
Execute contract tests (Pact, OpenAPI-driven Spectral, etc.) to verify API contracts are unbroken.

### 4. Run security scan
Execute static analysis security scanner (semgrep, snyk) against the codebase. Capture findings by severity.

### 5. Run performance regression
Execute performance test suite (k6, Gatling) against baseline. Flag regressions beyond configured thresholds.

### 6. Check coverage
Measure line coverage for new/modified lines. Enforce 80% threshold. If below threshold, mark check as failed.

### 7. Enforce time budget
Track elapsed time. If approaching 30min (30 minutes), skip remaining non-critical checks and mark as `skipped` with reason `time-budget-exceeded`.

### 8. Aggregate and block
Compile all results into `GateCiArtifact`. Terminal state:
- Any `failed` → `blocked` (PR merge prevented)
- All `passed` and coverage met → `completed`
- Error → `failed`

## Completion

- full unit suite executed
- integration tests executed
- contract tests executed
- security scan completed
- performance regression executed
- coverage threshold enforced (80% lines)
- structured result returned
- PR blocked if any check failed
