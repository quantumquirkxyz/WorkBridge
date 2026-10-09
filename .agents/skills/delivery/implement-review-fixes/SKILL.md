---
name: "implement-review-fixes"
category: "delivery"
maturity: "stable"
version: "1"
description: "Read a GitHub PR remediation plan produced by plan-review-fixes, implement the planned corrections through the repositor"
capabilities: ""
outputs: ""
sideEffects:
  - write-code
  - commit-git
  - push-branch
dependencies: []
stopCondition: "Read a GitHub PR remediation plan produced by plan-review-fixes, implement the planned corrections through the repositor complete; artifact saved; completion criteria checked."
risk: "medium"
trustTier: "3"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "review"
modelTier: "code"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/implement-review-fixes.json"
diataxis: "how-to"
tags: ["delivery"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: skill invocation with the user's request and available context.
- Output: a structured artifact or guidance aligned to the skill's declared outputs.
- Scope: stay within the skill's declared boundaries; do not broaden without explicit direction.
- Rule: follow the skill's completion criteria and stop condition exactly.

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

Emit `ImplementReviewFixesArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/implement-review-fixes/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Implement Review Fixes

## Overview

Execute an existing review correction plan. This skill treats the PR comment as the source of truth, applies only scoped corrections, and leaves the PR ready for another review-pr pass. Use `references/implementation-note.md` as the canonical completion shape.

The completion note still needs the familiar closing sections that make the handoff explicit:

- Status: implemented
- Scope Notes
If the planned fixes are blocked by a conflicted branch state, hand off to `resolving-merge-conflicts` first, then resume the review-fix plan on the clean branch state.
When the fix plan references tracker metadata, use [`docs/agents/work-item-format.md`](../../../../docs/reference/agents/work-item-format.md) so labels, milestone, and project context remain consistent with the linked issue.
If a planned item no longer matches the diff, stop and refresh the plan instead of improvising around it.

## Workflow

1. Identify the PR and branch.
   - Prefer an explicit PR number from the user.
   - Otherwise run `gh pr view --json number,headRefName,baseRefName,url,title`.
   - Confirm the current branch matches the PR head branch before editing.

2. Read the current plan.
   - Fetch PR comments with `gh pr view <number> --comments`.
   - Use the latest comment headed `## Review Fix Plan` with `Status: planned`.
   - Stop if no plan exists; run plan-review-fixes first.

3. Validate the plan against the current diff.
   - Confirm the files or symbols named in the plan still exist.
   - Check whether any item is already fixed; mark it complete in your local working notes and do not rework it.
   - If the diff has moved enough that the plan is stale, stop and ask for a new plan-review-fixes pass.
   - If the branch is conflicted, stop and hand off to `resolving-merge-conflicts` before trying to apply the plan.

4. Implement scoped fixes.
   - Use the implement workflow for the actual edits.
   - Prefer test-first fixes when a finding maps to observable behavior.
   - Keep each correction local to the finding that motivated it.
   - Avoid opportunistic refactors unless the plan explicitly requires them.
   - If a fix changes behavior beyond the original finding, pause and send the PR back through review-pr.

5. Validate.
   - Run targeted tests or checks named in the plan.
   - Run repo-level typecheck/lint/test commands when the change surface justifies it.
   - If a planned item cannot be validated locally, state the reason in the PR completion note.
   - Validation should cover the exact failure mode the finding identified, not an adjacent check.

6. Report completion on the PR.
   - Comment with heading `## Review Fix Implementation`.
   - Include completed items, validation commands, failures or skipped checks, and any remaining blockers.
   - Do not mark the PR clean; only a later review-pr pass can do that.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml