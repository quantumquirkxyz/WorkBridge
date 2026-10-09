---
name: gate-post-merge
category: platform
maturity: stable
version: 1
description: Post-deployment quality gate triggered on merge-to-main events. Runs canary smoke test, production health check, and feature flag verification. Alerts on failure without blocking the workflow.
capabilities:
  - apply post-merge quality gate
  - run canary and health checks
  - produce quality gate artifact
  - validate quality gate completion criteria
outputs:
  - type: object
    name: GatePostMergeArtifact
    properties:
      trigger: { type: string, enum: [merge-to-main] }
      checks:
        type: array
        items:
          type: object
          properties:
            name: { type: string }
            status: { type: string, enum: [passed, failed, skipped] }
            durationMs: { type: integer }
            output: { type: string }
      blockOnFailure: { type: boolean }
      alertOnFailure: { type: boolean }
      result: { type: string, enum: [completed, blocked, failed] }
    required: [trigger, checks, blockOnFailure, alertOnFailure, result]
sideEffects: []
dependencies: []
stopCondition: Post-deployment quality gate triggered on merge-to-main events complete; structured result returned; completion criteria checked.
risk: medium
trustTier: 1
maxIterations: 3
modelTier: fast
promptVersion: "2.0"
artifactType: plan
evaluators:
  - behavioral
  - regression
fixturesPath: .agents/skills/platform/fixtures/behavioral/gate-post-merge.json
diataxis: how-to
tags: [quality, production, canary, gate]
compatibility: [deployment, observability, ship-subissue]
approvalRequired: false
approvalFor: []
---

## Contract

- Input: merge-to-main event, deployment metadata, production environment config.
- Output: `GatePostMergeArtifact` with canary, health, and feature flag results.
- Scope: post-deployment checks only — canary smoke, health check, feature flag verification.
- Rule: do not block the workflow on failure — alert instead.
- Rule: canary must reach minimum traffic threshold before health check runs.
- Rule: feature flag verification checks that new flags are present and correctly targeted.

## Provenance

| Question | Answer |
|---|---|
| What is the source of truth? | The merge-to-main event and deployment metadata |
| What is in scope? | Canary smoke test, production health check, feature flag verification |
| What is explicitly out of scope? | Full regression suite, load tests, manual QA |
| Who or what consumes this artifact afterward? | `observability` or incident-response if failures detected |
| What evidence proves it is done? | All checks completed, alerts sent if failures, structured result returned |
| What risk remains? | Canary may not catch all issues; health checks are surface-level; feature flags may have incomplete rollout |

## Artifact

Return `GatePostMergeArtifact` as structured output in the current response. Do not write local artifact files unless the user explicitly asks for an export.

## Process

### 1. Trigger canary smoke test
Deploy to canary environment (5-10% traffic). Run smoke tests against canary endpoints. Wait for success or timeout.

### 2. Run production health check
Query production health endpoints. Check: response time, error rate, database connectivity, cache hit rate. Compare against SLO thresholds.

### 3. Verify feature flags
Check that all feature flags introduced in this merge are present in the flag service, have correct targeting rules, and default to off for safety.

### 4. Alert on failure
If any check fails:
- Send alert to incident channel (Slack, PagerDuty, etc.)
- Tag the merge commit with failure metadata
- Do NOT block the workflow — merge already happened

### 5. Aggregate results
Compile all check results into `GatePostMergeArtifact`. Terminal state:
- All `passed` → `completed`
- Any `failed` → `failed` (but workflow not blocked)

## Completion

- canary smoke test completed
- production health check completed
- feature flag verification completed
- alerts sent if any check failed
- structured result returned
