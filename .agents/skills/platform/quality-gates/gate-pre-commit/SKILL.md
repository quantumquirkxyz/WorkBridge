---
name: gate-pre-commit
category: platform
maturity: stable
version: 1
description: Shift-left quality gate triggered on git-commit events. Runs lint + typecheck on changed files only, unit tests for changed files only, lightweight dependency vulnerability check, and blocks on failure within a 10s budget.
capabilities:
  - apply pre-commit quality gate
  - run scoped checks
  - produce quality gate artifact
  - validate quality gate completion criteria
outputs:
  - type: object
    name: GatePreCommitArtifact
    properties:
      trigger: { type: string, enum: [git-commit] }
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
      result: { type: string, enum: [completed, blocked, failed] }
    required: [trigger, checks, maxDuration, blockOnFailure, result]
sideEffects: []
dependencies: []
stopCondition: Shift-left quality gate triggered on git-commit events complete; structured result returned; completion criteria checked.
risk: low
trustTier: 1
maxIterations: 3
modelTier: fast
promptVersion: "2.0"
artifactType: plan
evaluators:
  - behavioral
  - regression
fixturesPath: .agents/skills/platform/fixtures/behavioral/gate-pre-commit.json
diataxis: how-to
tags: [quality, shift-left, git, gate]
compatibility: [implement, publish-open-pr]
approvalRequired: false
approvalFor: []
---

## Contract

- Input: git-commit event, staged diff, project tooling config.
- Output: `GatePreCommitArtifact` with per-check results and terminal state.
- Scope: pre-commit checks only — lint/typecheck on changed files, unit tests on changed files, lightweight dependency vuln check.
- Rule: enforce maxDuration of 10 seconds; skip slow checks rather than exceed budget.
- Rule: scope to changed files only — do not run full suite here.
- Rule: block on failure; commit must not proceed if any check fails.

## Provenance

| Question | Answer |
|---|---|
| What is the source of truth? | The git-commit event and staged diff |
| What is in scope? | Changed files since last commit; lint, typecheck, unit tests, dependency vuln check |
| What is explicitly out of scope? | Full integration suite, security scan, performance tests, E2E tests |
| Who or what consumes this artifact afterward? | `gate-ci` or commit process |
| What evidence proves it is done? | All checks completed within 10s budget, structured result returned, terminal state determined |
| What risk remains? | Skipped checks due to time budget; lightweight vuln check may miss transitive vulnerabilities |

## Artifact

Return `GatePreCommitArtifact` as structured output in the current response. Do not write local artifact files unless the user explicitly asks for an export.

## Process

### 1. Capture staged diff
Run `git diff --cached --name-only` to get the list of staged files. If no staged files, report idle.

### 2. Run lint + typecheck on changed files
Execute linter and type checker against only the staged files. Use project-native tooling (eslint, tsc --noEmit, etc.).

### 3. Run unit tests for changed files
Map changed files to their corresponding test files. Run only those unit tests. If no test files map, skip with reason.

### 4. Run lightweight dependency vulnerability check
Execute a fast dependency check (npm audit --audit-level=high, pip-audit, etc.). Limit to direct dependencies only.

### 5. Enforce time budget
Track elapsed time. If any check risks exceeding 10 seconds total, skip remaining checks and mark them as `skipped` with reason `time-budget-exceeded`.

### 6. Aggregate results
Compile all check results into `GatePreCommitArtifact`. Terminal state:
- Any `failed` → `blocked` (commit prevented)
- All `passed` → `completed`
- Error → `failed`

### 7. Enforce blockOnFailure
If terminal state is `blocked`, return exit code 1 to prevent the commit.

## Completion

- all applicable checks have run or been skipped with reason
- total duration within 10s budget
- structured result returned
- commit blocked if any check failed
