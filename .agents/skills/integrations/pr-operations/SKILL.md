---
name: "pr-operations"
category: "integrations"
maturity: "stable"
version: "1"
description: "Manage pull request operations with branch, diff, validation, reviewer, label, comment, and publication evidence while keeping merge decisions explicit."
capabilities: ""
outputs: ""
sideEffects: ""
dependencies: ""
stopCondition: "Requested PR actions are completed or explicitly skipped, target PRs are identified, and validation or readiness evidence is reported."
risk: "medium"
trustTier: "3"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "pull-request"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/pr-operations.json"
diataxis: "how-to"
tags: ["integrations"]
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

Emit `PrOperationsArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/pr-operations/{identifier}.json`
- Markdown view: same filename with `.md` extension


## 
## 
## Rules

- Rule: resolve the repository, head branch, base branch, and target PR before applying any PR mutation.
- Rule: read the diff or branch status before creating or materially updating a PR body so the description matches the actual change.
- Rule: include validation evidence in PR creation or update summaries; if validation was skipped, state why.
- Rule: avoid duplicate PRs by searching for an open PR with the same head/base pair before creating a new one.
- Rule: do not request reviewers or teams unless the user, CODEOWNERS, project workflow, or existing PR convention supports that notification.
- Rule: never merge a PR from this skill; hand off merge decisions to the user or the repository's release workflow.
- Rule: after mutation, return stable URLs, PR number, branch pair, and any review-blocking conditions.
- Rule: use `references/pr-operation-summary-template.md` when creating or materially updating a PR.
- Rule: consult `references/pr-provider-guidelines.md` before translating generic PR operations into GitHub, GitLab, Bitbucket, or Forgejo actions.

## Workflow

1. Identify the repository, head branch, base branch, and desired operation: create, update title, update body, comment, label, request review, mark ready, or report status.
2. Inspect current PR state or search for an existing PR matching the branch pair.
3. Inspect the relevant diff, recent commits, and validation evidence when the operation changes the PR narrative or review readiness.
4. Draft the exact PR title, body, comment, labels, or review requests before applying them.
5. Apply only the requested PR mutations and avoid combining unrelated review coordination work.
6. Re-read or verify the PR after mutation when tooling allows it.
7. Summarize the final PR state, including what changed, what was validated, and what remains for reviewers.

## References

- `references/pr-operation-summary-template.md` - reusable PR operation summary format.
- `references/pr-provider-guidelines.md` - provider-specific mapping notes and merge-safety boundaries.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml