---
name: "release-management"
category: "platform"
maturity: "stable"
version: "1"
description: "Plan the release train, CI handoff, and rollback posture for a project — so shipping stays controlled."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Plan the release train, CI handoff, and rollback posture for a project complete; artifact saved; completion criteria checked."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "platform"
modelTier: "router"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/release-management.json"
diataxis: "how-to"
tags: ["platform"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: release brief, delivery context, and pipeline constraints.
- Output: release train guidance, CI handoff guidance, rollback posture, and a release decision record.
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

Emit `ReleaseManagementArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/release-management/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Release Management

Use this skill when a project needs governance for getting changes into production without turning shipping into guesswork. It should define the release train, the CI handoff, approvals, and the conditions for backing out. It decides when a release may advance; `deployment` decides how the runtime promotion works.


## Steps

1. Identify the release cadence, change surface, release candidate, and provenance.
2. Define required CI gates, advisory checks, approvals, and the handoff into `deployment`.
3. Define freeze, emergency-release, rollback, and forward-fix authority.
4. Describe post-release verification, evidence retention, and the decision owner for each outcome.
5. Note coordination required across repositories, runtime, operators, or external dependencies.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml