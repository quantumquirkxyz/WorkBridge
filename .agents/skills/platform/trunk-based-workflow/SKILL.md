---
name: trunk-based-workflow
category: platform
maturity: stable
version: 1
description: Orchestrate trunk-based development — short-lived branches, small PRs, CI gating, and merge-to-trunk discipline.
capabilities:
  - validate branch age and PR size
  - enforce CI gating before merge
  - apply merge strategy and branch cleanup
  - emit TrunkBasedWorkflowArtifact
outputs: TrunkBasedWorkflowArtifact as JSON and Markdown
sideEffects: none
dependencies:
  - implement
  - publish-open-pr
  - gate-ci
  - gate-pre-commit
stopCondition: Trunk-based workflow validation complete; artifact emitted; completion criteria checked.
risk: low
trustTier: 1
maxIterations: 4
modelTier: router
promptVersion: "2.0"
artifactType: plan
fixturesPath: .agents/skills/platform/fixtures/regression/trunk-based-workflow.json
tags: [git, trunk-based, branching, ci, workflow]
compatibility: [implement, publish-open-pr, gate-ci, gate-pre-commit]
---

# Trunk-Based Workflow

## Why

Trunk-based development reduces merge hell by keeping branches short-lived and small. When every branch is merged within 24 hours and every PR stays under 400 lines, the cumulative diff against main remains reviewable and the blast radius of any conflict is bounded. Long-lived feature branches accumulate hidden conflicts, diverge from trunk behavior, and force large, brittle merges. Trunk-based discipline makes merges routine, reviews fast, and rollbacks safe because every commit is a small, reversible change on a shared baseline.

Use this skill when the project needs to enforce trunk-based development discipline. It validates that every change follows short-lived branch and small PR rules before merge, emits a structured artifact, and records completion evidence.

## Contract

- Input: repository state, branch metadata (age, changed lines), CI status, merge strategy preference.
- Output: TrunkBasedWorkflowArtifact — a structured plan capturing validation results, decisions, and completion status.
- Scope: enforce workflow rules; not responsible for writing application code.
- Rule: every feature branch must be shorter than 24 hours old at merge time.
- Rule: every PR must be 400 lines changed or fewer.
- Rule: CI must be green before merge; no exceptions without explicit approval.
- Rule: merge strategy is either squash or merge-commit; never rebase after review.
- Rule: branch must be deleted after successful merge to keep trunk clean.
- Rule: violations must be recorded in the artifact with severity and remediation.

## Provenance

| Dimension | Value |
|---|---|
| Source | quirk skills bundle, trunk-based development pattern |
| Author | quirk |
| Version | 1 |
| Maturity | stable |
| Trust tier | 1 — read-only planning; no side effects |
| Compatibility | implement, publish-open-pr, gate-ci, gate-pre-commit |
| Risk | low |
| License | same as repository |

## Artifact

Emit `TrunkBasedWorkflowArtifact` as both JSON and Markdown.

Observability: emit a `traceId` and record validation step durations so downstream dashboards can measure branch-age check latency, PR-size check latency, and CI-gate wait time. Each violation entry must include a `rule` and `severity` so alerting rules can fire on repeated policy breaches.

### TrunkBasedWorkflowArtifact (typed schema)

```json
{
  "$schema": "trunk-based-workflow-artifact-v1",
  "type": "object",
  "required": ["schema", "version", "validatedAt", "repository", "validations", "completion"],
  "properties": {
    "schema": {
      "type": "string",
      "const": "trunk-based-workflow-artifact-v1"
    },
    "version": {
      "type": "string",
      "pattern": "^\\d+\\.\\d+$"
    },
    "validatedAt": {
      "type": "string",
      "format": "date-time"
    },
    "repository": {
      "type": "string",
      "description": "Repository identifier"
    },
    "defaultBranch": {
      "type": "string",
      "description": "Name of the trunk branch, e.g. main or master"
    },
    "validations": {
      "type": "object",
      "required": ["branchAge", "prSize", "ciStatus", "mergeStrategy", "branchCleanup"],
      "properties": {
        "branchAge": {
          "type": "object",
          "required": ["passed", "ageHours", "maxAgeHours", "message"],
          "properties": {
            "passed": { "type": "boolean" },
            "ageHours": { "type": "number", "minimum": 0 },
            "maxAgeHours": { "type": "number", "minimum": 0, "const": 24 },
            "message": { "type": "string" }
          }
        },
        "prSize": {
          "type": "object",
          "required": ["passed", "linesChanged", "maxLines", "message"],
          "properties": {
            "passed": { "type": "boolean" },
            "linesChanged": { "type": "integer", "minimum": 0 },
            "maxLines": { "type": "integer", "minimum": 0, "const": 400 },
            "message": { "type": "string" }
          }
        },
        "ciStatus": {
          "type": "object",
          "required": ["passed", "status", "message"],
          "properties": {
            "passed": { "type": "boolean" },
            "status": { "type": "string", "enum": ["green", "red", "pending"] },
            "message": { "type": "string" }
          }
        },
        "mergeStrategy": {
          "type": "object",
          "required": ["strategy", "message"],
          "properties": {
            "strategy": { "type": "string", "enum": ["squash", "merge-commit"] },
            "message": { "type": "string" }
          }
        },
        "branchCleanup": {
          "type": "object",
          "required": ["willDelete", "message"],
          "properties": {
            "willDelete": { "type": "boolean" },
            "message": { "type": "string" }
          }
        }
      }
    },
    "violations": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["rule", "severity", "message", "remediation"],
        "properties": {
          "rule": { "type": "string" },
          "severity": { "type": "string", "enum": ["error", "warning", "info"] },
          "message": { "type": "string" },
          "remediation": { "type": "string" }
        }
      }
    },
    "decisions": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["decision", "rationale"],
        "properties": {
          "decision": { "type": "string" },
          "rationale": { "type": "string" }
        }
      }
    },
    "completion": {
      "type": "object",
      "required": ["allPassed", "criteria"],
      "properties": {
        "allPassed": { "type": "boolean" },
        "criteria": {
          "type": "object",
          "required": ["branchAgeCheck", "prSizeCheck", "ciGreenCheck", "mergeStrategySet", "cleanupPlanned"],
          "properties": {
            "branchAgeCheck": { "type": "boolean" },
            "prSizeCheck": { "type": "boolean" },
            "ciGreenCheck": { "type": "boolean" },
            "mergeStrategySet": { "type": "boolean" },
            "cleanupPlanned": { "type": "boolean" }
          }
        }
      }
    }
  }
}
```

## Process

### Step 1: Validate branch age (< 24h)

- Inspect the feature branch creation timestamp against the current time.
- Compute age in hours.
- Pass if age < 24 hours. Fail if age >= 24 hours and record a violation.

**Completion criterion:** branch age is known and classified as passing or failing.

### Step 2: Validate PR size (max 400 lines changed)

- Count total lines changed in the PR (additions + deletions).
- Pass if lines changed <= 400. Fail if > 400 and record a violation.

**Completion criterion:** PR line count is known and classified as passing or failing.

### Step 3: Enforce CI green before merge

- Check the latest CI run status for the PR.
- Pass if status is green. Flag as pending if still running. Fail if red.

**Completion criterion:** CI status is confirmed green (or pending/failing with explicit approval noted).

### Step 4: Merge strategy (squash or merge-commit)

- Select merge strategy: `squash` (default, preferred for clean history) or `merge-commit` (preserves full branch history).
- Record the chosen strategy and rationale in the artifact.

**Completion criterion:** merge strategy is explicitly recorded.

### Step 5: Delete branch after merge

- Confirm branch deletion will occur after successful merge.
- Record cleanup intent in the artifact.

**Completion criterion:** cleanup plan is confirmed.

## Completion criteria

- branch age validated against < 24h threshold
- PR size validated against <= 400 lines changed
- CI green status confirmed
- merge strategy explicitly recorded
- branch cleanup planned and recorded
- TrunkBasedWorkflowArtifact emitted as JSON and Markdown

@include .agents/skills/platform/contract-base.xml
