---
name: "feature-flag"
category: "platform"
description: "Design and manage feature flags with short-lived flags, gradual rollouts, kill switches, A/B testing, and cleanup discipline."
artifactType: "feature-flag"
modelTier: "router"
tags: ["platform"]
compatibility: []
outputs: ""
stopCondition: "Feature flag design and management complete; FeatureFlagArtifact emitted; completion criteria checked."
risk: "low"
trustTier: "1"
maxIterations: "4"
fixturesPath: ".agents/skills/platform/fixtures/behavioral/feature-flag.json"
promptVersion: "2.0"
evaluators: ["behavioral", "regression"]
diataxis: "how-to"
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: feature request, rollout constraints, targeting context, and operational requirements.
- Output: FeatureFlagArtifact in JSON and Markdown.
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

Emit `FeatureFlagArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/feature-flag/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Feature Flag

## Why

Short-lived flags prevent tech debt because they force the team to retire the switch at the same time the feature ships. A flag with a 4-week cleanup deadline is a contract, not a suggestion. When flags outlive their purpose they become zombie switches: hidden branching logic that bloats code paths, complicates testing, and obscures intent. By tying every flag to a cleanup deadline and an owner, the team maintains a tight feedback loop between rollout and retirement, keeping the codebase navigable and the deployment pipeline honest.

Use this skill when a project needs to introduce a new feature flag, plan a safe rollout, or retire an existing flag. It keeps flags short-lived, well-targeted, and observable so the codebase does not accumulate dead switches.


## Provenance

| Dimension | Bar |
|---|---|
| Correctness | flag purpose is unambiguous; targeting rules are testable |
| Completeness | cleanup deadline, owner, metrics, and dependencies are recorded |
| Consistency | naming follows project conventions; type taxonomy matches usage |
| Timeliness | flags are retired within the declared cleanup deadline |
| Safety | kill switches are reversible without deploy; rollout limits are enforced |

## Artifact

Emit a `FeatureFlagArtifact` as JSON and a human-readable Markdown summary.

Observability: the artifact must include `traceId`, `owner`, and `cleanupOwner` fields so that flag state changes are auditable. Each flag state transition must emit a record to the observability pipeline with timestamp, actor, and previous state.

### FeatureFlagArtifact Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "FeatureFlagArtifact",
  "type": "object",
  "required": ["name", "purpose", "type", "targetingRules", "rolloutPercentage", "cleanupDeadline", "status", "dependencies"],
  "properties": {
    "name": {
      "type": "string",
      "description": "Unique flag identifier"
    },
    "purpose": {
      "type": "string",
      "description": "Why this flag exists"
    },
    "type": {
      "type": "string",
      "enum": ["release", "experiment", "kill-switch"],
      "description": "Flag purpose category"
    },
    "targetingRules": {
      "type": "array",
      "items": {"type": "string"},
      "description": "Explicit targeting conditions"
    },
    "rolloutPercentage": {
      "type": "integer",
      "minimum": 0,
      "maximum": 100,
      "description": "Percentage of users exposed when active"
    },
    "cleanupDeadline": {
      "type": "string",
      "format": "date",
      "description": "Maximum date before the flag must be retired"
    },
    "status": {
      "type": "string",
      "enum": ["draft", "active", "completed", "cleaned"],
      "description": "Current lifecycle state"
    },
    "dependencies": {
      "type": "array",
      "items": {"type": "string"},
      "description": "Flags or services this flag depends on"
    }
  }
}
```

### Markdown Summary

```markdown
# Feature Flag: {name}

**Purpose:** {purpose}
**Type:** {type}
**Status:** {status}
**Rollout:** {rolloutPercentage}%
**Cleanup Deadline:** {cleanupDeadline}

## Targeting Rules
{targetingRules}

## Dependencies
{dependencies}

## Rollout Plan
1. Start at {rolloutPercentage}% with explicit targeting rules.
2. Observe metrics and error rates for 24-48 hours.
3. Increase in stages to 100% or retire at cleanup deadline.

## Cleanup Plan
- Remove flag code on or before {cleanupDeadline}.
- Delete flag configuration after full rollout is confirmed.
- Verify no dead code remains.
```

## Process

1. Identify flag purpose: classify as release flag, experiment, or operational kill switch.
2. Define targeting rules and rollout plan: specify who gets the flag, at what percentage, and what gates must pass before expansion.
3. Set cleanup deadline: max 4 weeks from activation; record owner and success criteria.
4. Document flag in registry: emit FeatureFlagArtifact with JSON schema and Markdown summary.
5. Verify flag state in gate-post-merge: confirm flag default is off, targeting rules are enforced, and observability is wired.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml