---
name: publish-open-pr
category: routing
maturity: stable
version: 2
description: Use when the user wants to publish a finished subissue as an open GitHub pull request from an already-prepared issue branch — with scoped, auditable publication.
capabilities:
  - apply publish open pr workflow
  - produce publish open pr artifact
  - validate publish open pr completion criteria
outputs:
  - type: object
    name: PublishOpenPrArtifact
    properties:
      status: { type: string, enum: [completed, blocked, failed] }
      branch: { type: string }
      prNumber: { type: integer }
      prUrl: { type: string }
      title: { type: string }
      validation: { type: object }
      gateCiResult: { type: object }
      reviewers: { type: array, items: { type: string } }
      labels: { type: array, items: { type: string } }
    required: [status, branch, prNumber, prUrl, title, validation, gateCiResult]
sideEffects:
  - push-branch
  - create-pull-request
dependencies: []
stopCondition: Use when the user wants to publish a finished subissue as an open GitHub pull request from an already-prepared issue branch complete; structured result returned; completion criteria checked.
risk: medium
trustTier: 3
maxIterations: 6
modelTier: router
promptVersion: "2.0"
artifactType: pull-request
evaluators:
  - behavioral
  - regression
  - traceability
fixturesPath: .agents/skills/platform/fixtures/behavioral/publish-open-pr.json
diataxis: how-to
tags: [routing, pr, publication, quality-gate]
compatibility: [review-pr, ship-subissue]
approvalRequired: false
approvalFor: []
---

## Contract

- Input: validated issue branch, linked issue metadata, PR bundle metadata, and quality gate results.
- Output: `PublishOpenPrArtifact` as structured output in the response. See `.agents/skills/platform/schemas/publish-open-pr-schema.json`.
- Scope: package, push, and publish a completed branch as an open PR; do not reopen implementation decisions.
- Rule: never open a PR before `gate-ci` has passed on the pushed branch.
- Rule: never create or amend commits here; that belongs to `implement`.
- Rule: never merge the PR or close the issue here; that belongs to `ship-subissue`.
- Rule: the linked issue's labels and milestone are the source of truth for PR metadata.

## Provenance

| Question | Answer |
|---|---|
| What is the source of truth? | The linked issue metadata and the prepared branch state |
| What is in scope? | Packaging, pushing, and opening the PR |
| What is explicitly out of scope? | Implementation, review, merge, issue completion |
| Who or what consumes this artifact afterward? | `review-pr` |
| What evidence proves it is done? | Open PR exists, gate-ci passed, structured result returned |
| What risk remains? | Reviewer rejection; failing post-publish checks |

## Artifact

Return `PublishOpenPrArtifact` as structured output in the current response. Do not write local artifact files unless the user explicitly asks for an export.

## Process

### 1. Confirm scope

- Run `git status -sb`.
- Review the changed files and the relevant diff hunks.
- Confirm the current branch matches the dedicated issue branch and only contains that subissue's work.
- If the intended scope is unclear, stop and ask for clarification before opening the PR.

### 2. Verify prerequisites

- Confirm `git` is available.
- Confirm `gh` is available and `gh auth status` succeeds.
- Confirm the current branch can push to `origin`.

### 3. Run gate-ci before opening PR

- Execute `gate-ci` against the current branch state.
- If `gate-ci` fails, stop and report the failure rather than opening a PR.
- Summarize the gate-ci result in the PR body or PR metadata; do not write a local gate artifact.

### 4. Run the smallest relevant validation

- Follow [Validation](references/validation.md).
- If validation fails, stop and report it rather than changing the branch here.

### 5. Prepare the PR bundle

- Follow [PR Body](references/pr-body.md).
- Run `scripts/render_pr_bundle.py` to materialize the title, body, and metadata from the current branch, latest commit, validation results, and linked issue.
- Use explicit temporary files only when required by `gh pr create --body-file`; delete or ignore them after the PR is opened.
- If the repository already has a PR template, fill it in rather than replacing it.

### 6. Push the branch and open a PR

- Use `git push -u origin <branch>`.
- Use the metadata bundle to set:
  - assignee: the current GitHub user
  - reviewers: the other human collaborator, and any additional reviewers explicitly resolved by the bundle
  - labels: the linked issue's non-triage labels
  - milestone: the linked issue milestone, if one is set
- Use `gh pr create --title "<title>" --body-file "<body-file>" --assignee "@me" --milestone "<milestone>"` without `--draft`, then add repeated `--label` and `--reviewer` flags from the metadata bundle.
- If GitHub rejects the non-draft PR path with a diff-resolution error for this prepared branch, retry the same PR as `--draft` rather than stopping.
- Use a title that matches the subissue and the actual diff.

### 7. Hand off to the next workflow

- After the PR opens, the next workflow is `review-pr`.
- If review finds defects, hand off to `review-fix-loop`.
- When the latest review is clean, hand off to `ship-subissue` for merge and issue completion.

## Completion

- branch scope confirmed
- prerequisites verified
- `gate-ci` passed on pushed branch
- validation completed
- PR bundle prepared from linked issue metadata
- branch pushed to origin
- open PR created with title, body, assignee, labels, milestone, and reviewers
- `PublishOpenPrArtifact` returned as structured output
- handoff to `review-pr` is explicit

---
@include .agents/skills/platform/contract-base.xml
