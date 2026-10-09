---
name: "ship-subissue"
category: "routing"
maturity: "stable"
version: "1"
description: "Use when a finished subissue already has a clean PR and you need to merge it, mark it as completed, and close the linked issue — with release discipline."
capabilities: ""
outputs: ""
sideEffects:
  - merge-pull-request
  - close-issue
  - update-project

dependencies: []
stopCondition: "Use when a finished subissue already has a clean PR and you need to merge it, mark it as completed, and close the linked issue complete; structured result returned; completion criteria checked."
risk: "high"
trustTier: "4"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "routing"
modelTier: "router"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/ship-subissue.json"
diataxis: "how-to"
tags: ["routing"]
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
| What evidence proves it is done? | Completion criteria met, structured result returned, validation passed |
| What risk remains? | Subjective judgment calls, missing context, or external dependency failures


## Artifact

Return `ShipSubissueArtifact` as structured output in the current response. Do not write local artifact files unless the user explicitly asks for an export.


# 
# 
# Ship Subissue

Merge one approved repository-local subissue PR, including a corrective subissue PR, mark the subissue as completed, and close out the linked issue when needed.
Use the canonical work-item format in [`docs/agents/work-item-format.md`](../../../../docs/reference/agents/work-item-format.md) when deciding what metadata to preserve: linked-issue labels and milestone are the source of truth, and the completion note should not introduce conflicting tracker metadata.

## Workflow

1. Confirm the target.
   - Read the open PR with `gh pr view`.
   - Confirm the PR still belongs to the current branch and subissue.
   - Confirm the linked issue reference is clear.
   - Confirm the branch is clean and no conflicted branch state remains from merge/rebase or review-request follow-up work; if it is conflicted, return to `resolving-merge-conflicts` before shipping.
2. Confirm review is clean.
   - Only proceed if the last `review-pr` pass was clean on both Standards and Spec.
   - If review is not clean, stop and return to `review-fix-loop`.
3. Merge the PR.
   - Use `gh pr merge <number>` with the repository's accepted merge strategy.
   - Delete the branch if the repository convention allows it.
4. Close or complete the issue.
   - If the workflow uses an explicit completion state, update it to reflect that the subissue is done.
   - If GitHub does not auto-close the linked issue, close it with `gh issue close <number> --comment "Merged in PR #<number>."`
   - Do not guess the issue number.
5. Record completion.
   - Leave a short note on the PR or issue summarizing the merge and completion state.

## Guardrails

- Never merge with unresolved review findings.
- Never mark an issue complete unless the linked reference is clear.
- Never delete the branch before the merge has succeeded.

## Completion

- the skill's completion criteria are explicitly checked
- the structured result is returned and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml