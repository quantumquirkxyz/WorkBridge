---
name: "contribution-workflow-optimizer"
category: "delivery"
maturity: "stable"
version: "1"
description: "Inspect changed Skills and recommend contribution improvements across standards, docs, tests, and examples; use when eva"
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Inspect changed Skills and recommend contribution improvements across standards, docs, tests, and examples complete; structured result returned; completion criteria checked."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "workflow"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/contribution-workflow-optimizer.json"
diataxis: "how-to"
tags: ["delivery"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: a pull-request base reference and changed Skill files.
- Output: prioritized checks for contract, documentation, dependencies, tests, and examples.
- Scope: recommend changes only; implementation and merge remain separate workflows.
- Rule: recommend changes only; implementation and merge remain separate workflows.
- Rule: documented standards override defaults; explicit project rules take precedence.
- Rule: if blocked by missing context or dependencies, surface the blocker before proceeding.

## Provenance

| Question | Answer |
|---|---|
| What is the source of truth? | The user's request, originating spec/issue, and the skill's declared outputs |
| What is in scope? | Work covered by the skill's acceptance criteria and completion rules |
| What is explicitly out of scope? | Files, behaviors, and decisions outside the skill's declared boundary |
| Who or what consumes this artifact afterward? | The next skill in the workflow or the user |
| What evidence proves it is done? | Completion criteria met, structured result returned, validation passed |
| What risk remains? | Subjective judgment calls, missing context, or external dependency failures


## Artifact

Return `ContributionWorkflowOptimizerArtifact` as structured output in the current response. Do not write local artifact files unless the user explicitly asks for an export.


# 
# 
# Contribution Workflow Optimizer


## Rules

- Rule: scope findings to changed Skills unless the change exposes a repository-wide regression.
- Rule: separate blockers, required fixes, and advisory improvements.
- Rule: check frontmatter, body contract, dependencies, references, validators, and examples independently.
- Rule: treat generated or lockfile changes as evidence to verify, not as proof of quality.
- Rule: recommend the smallest contributor action that restores merge readiness.

## Steps

1. Identify base ref, changed Skill files, lockfile changes, and related docs.
2. Run the PR check and repository validators.
3. Inspect each changed Skill for contract clarity, side effects, outputs, dependencies, and completion criteria.
4. Check examples, references, and tests for drift.
5. Produce prioritized recommendations with evidence and owner-friendly wording.

## Completion

- the skill's completion criteria are explicitly checked
- the structured result is returned and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml