---
name: "review-fix-loop"
category: "delivery"
maturity: "stable"
version: "1"
description: "Orchestrate the PR repair loop: run review-pr, use plan-review-fixes when findings exist, use implement-review-fixes to apply them, and repeat until the PR is clean or blocked. This skill coordinates the loop only."
license: "MIT"
capabilities: ""
outputs: ""
sideEffects:
  - write-code
  - post-pr-comment
  - commit-git
  - push-branch

dependencies: []
stopCondition: "Orchestrate the PR repair loop: run review-pr, use plan-review-fixes when findings exist, use implement-review-fixes to apply them, and repeat until the PR is clean or blocked complete; artifact saved; completion criteria checked."
risk: "medium"
trustTier: "3"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "review"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: .agents/skills/platform/fixtures/behavioral/review-fix-loop.json
diataxis: "how-to"
tags: ["delivery"]
compatibility: []
approvalRequired: "true"
approvalFor: ["write-code", "post-pr-comment", "commit-git", "push-branch"]
clauses:
  - id: REVIEW-FIX-LOOP-1
    text: "Stop instead of restating the same repair when a pass would post the same review-fix plan without a new finding."
    check: "evals/behavioral/review-fix-loop.json#REVIEW-FIX-LOOP-1"
  - id: REVIEW-FIX-LOOP-2
    text: "Stop and report the blocker when the same blocking condition repeats for three consecutive loop passes."
    check: "evals/behavioral/review-fix-loop.json#REVIEW-FIX-LOOP-2"
  - id: REVIEW-FIX-LOOP-3
    text: "Never widen scope during a repeat pass unless a new review finding makes it unavoidable."
    check: "evals/behavioral/review-fix-loop.json#REVIEW-FIX-LOOP-3"
reloadPolicy: on-trigger
---

## Contract

- Input: one PR, one fixed point, and one spec source when needed.
- Output: either a clean review state or a blocked repair loop with a documented cause.
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

Emit `ReviewFixLoopArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/review-fix-loop/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Review Fix Loop

## Overview

Coordinate review, planning, and implementation without diluting any one skill's responsibility. The review remains the measurement instrument; this skill decides whether to plan fixes, implement them, repeat, or hand off to ship-subissue.
Use the canonical work-item metadata format in [`docs/agents/work-item-format.md`](../../../../docs/reference/agents/work-item-format.md) as the source of truth for labels, milestone, and project metadata when preserving the loop state in comments or handoffs.
Keep the loop tight: if the same review-fix plan would be posted again without a new finding, stop rather than restating the same repair in different words.


## Inputs

- PR number or current branch with an associated PR.
- Fixed point for review-pr, such as `main`, a base branch, a commit SHA, or a tag.
- Spec source when review-pr cannot infer one.

If the fixed point is missing, ask for it before starting. If the PR is missing, identify it with `gh pr view` or stop.

## Workflow

1. Run review-pr.
   - Use the user-provided fixed point.
   - Preserve the output exactly enough that plan-review-fixes can cite Standards and Spec separately.

2. Decide.
   - If Standards and Spec both have no findings, stop the loop and tell the user the PR is ready for ship-subissue.
   - If either axis has findings, continue.
   - If the same blocking condition repeats for three consecutive loop passes, stop and report the blocker instead of looping indefinitely.
   - If the latest review changes only wording but not substance, treat it as the same blocker.
   - If a conflicted branch state was resolved, rerun review-pr on the cleaned branch before deciding whether to plan more fixes or hand off to ship-subissue.

3. Plan.
   - Use plan-review-fixes to turn the review findings into a PR comment headed `## Review Fix Plan`.
   - Treat the PR comment as the durable handoff between review and implementation.

4. Implement.
   - Use implement-review-fixes to apply the latest planned fixes.
   - Require local validation or an explicit explanation of skipped validation before the next review pass.
   - If the branch is conflicted, resolve that branch state first with `resolving-merge-conflicts`, then return here and continue the review-fix plan.

5. Repeat.
   - Run review-pr again against the same fixed point.
   - Continue until clean or blocked.
   - Do not widen scope during a repeat pass unless a new review finding makes it unavoidable.

## Loop State

Track these facts in the working response or PR comments:

- PR number and branch.
- Fixed point.
- Review pass count.
- Whether the last plan was posted.
- Whether the last implementation completed.
- Validation commands and results.
- Any metadata that must stay aligned with the linked issue: labels, milestone, and project fields.

## Exit Conditions

- **Clean:** review-pr reports no Standards findings and no Spec findings. Say that ship-subissue may proceed when the user wants merge/close/project updates or when a separate ship step will handle them.
- **Blocked:** missing PR, missing fixed point, stale or contradictory plan, failing validation without an obvious scoped fix, or the same findings recurring after three passes.
- **User stop:** user pauses or redirects the loop.

## Deferred Work

Some valid findings are not this PR's job: a real defect that belongs to another work item. Deferring one is allowed; dropping one is not, because a dropped finding turns into a surprise later.

- Rule: a finding may only be deferred with a named owner and a follow-up ticket. "Later", "backlog", and "someone" are not owners.
- Rule: record the deferred finding, its owner, and the follow-up ticket in the loop state and in the PR comment, so the next pass reads what was deferred instead of rediscovering it.
- Rule: a deferred finding that is missing either the owner or the ticket keeps the loop blocked, not clean.
- Rule: only out-of-scope findings may be deferred. A Standards finding that blocks the PR is repaired in the PR or the PR stays open.
- Rule: confirm on re-review that the deferral still holds: the follow-up ticket exists, is still open, and still describes the original finding.
- Rule: a follow-up ticket closed without the work being done, or an owner who no longer holds it, converts the deferral back into an open finding for the next pass.
- Rule: the exit summary reports the deferred list, so shipping the PR never hides what was postponed.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml