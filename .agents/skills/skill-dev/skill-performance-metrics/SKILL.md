---
name: "skill-performance-metrics"
category: "skill-dev"
maturity: "stable"
version: "1"
description: "Summarize Skill execution duration, success rate, and available run evidence — use when measuring Skill performance from logs and records."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Summarize Skill execution duration, success rate, and available run evidence complete; artifact saved; completion criteria checked."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "skill-dev"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/skill-performance-metrics.json"
diataxis: "how-to"
tags: ["skill-dev"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: an execution-record directory.
- Output: sample count, explicit duration availability, average duration, success rate, and cognitive-complexity estimates.
- Scope: report only available evidence; missing duration data is not zero.
- Rule: report only available evidence; missing duration data is not zero.
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

Emit `SkillPerformanceMetricsArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/skill-performance-metrics/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Skill Performance Metrics


## Rules

- Rule: report sample size before averages or rates.
- Rule: separate missing duration data from zero-duration executions.
- Rule: group results by Skill, status, and tool where the records allow it.
- Rule: do not infer quality from speed alone.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml