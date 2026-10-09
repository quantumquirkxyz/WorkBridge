---
name: "make-project"
category: "project"
maturity: "stable"
version: "1"
description: "Use when the user wants a new board in GitHub Projects, or another skill needs one — create the project, wire its fields, and preserve tracker semantics."
capabilities: ""
outputs: ""
sideEffects:
  - create-project
  - create-project-fields
  - link-repositories

dependencies: []
stopCondition: "Use when the user wants a new board in GitHub Projects, or another skill needs one complete; structured result returned; completion criteria checked."
risk: "medium"
trustTier: "3"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "pull-request"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/make-project.json"
diataxis: "how-to"
tags: ["project"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: an owner, a title, and the agreed scope (repos, fields, views, items).
- Output: a live board URL, confirmed by verification.
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
| What evidence proves it is done? | Completion criteria met, structured result returned, validation passed |
| What risk remains? | Subjective judgment calls, missing context, or external dependency failures


## Artifact

Return `MakeProjectArtifact` as structured output in the current response. Do not write local artifact files unless the user explicitly asks for an export.


# 
# 
# Make Project

Make a GitHub Projects (V2) **board** from scratch: create it, wire its fields and views, link the repositories it tracks, and populate it with items. Run the full setup every time.

The exact queries and mutations live in [`references/graphql.md`](references/graphql.md) — load it before the first step and use the snippet named in each step.


## Repo Context

Use the current repository's `CONTEXT.md`, `docs/agents/domain.md`, and issue tracker configuration when naming fields, views, and items. Default to portable project fields unless the repo already declares stronger domain fields:

- **Work Type** — feature, bug, chore, docs, research, release, review-fix
- **Repo Scope** — the repository, package, app, service, or module that owns the item
- **Phase** — spec, tickets, ready-for-agent, in-progress, review, blocked, done
- **Priority** — low, medium, high, urgent
- **Risk** — low, medium, high
- **Release Train** — the milestone, train, or target version when the repo uses one

Use the project's domain glossary when adding domain-specific fields. Avoid synonyms the glossary explicitly rejects.

## Steps

### 1. Confirm the target

Ask for or confirm:

- **Owner** — which org or user the board belongs to (default: `quantumquirkxyz`).
- **Title** — exact string.
- **Scope** — which repositories to link, which custom fields and views to create, which items to add, and any field values to set.

Completion: the owner, title, and full scope are written down and agreed before any mutation runs.

### 2. Resolve the owner's node ID

Run `resolve-owner` to get the owner's GraphQL node ID (org, user, or the repo's owner).

Completion: an owner node ID is in hand.

### 3. Check for an existing board

Run `list-boards`; if a board with the exact title already exists, stop and ask — reuse or rename.

Completion: no same-titled board exists, or the user has chosen to reuse or rename.

### 4. Create the board and set its defaults

Run `create-board`. Capture the project's node ID and URL. Then run `update-board` to set the readme/short description and visibility (public or private) to match the agreement.

Completion: the mutation returned a project ID and URL, and description and visibility match the agreement.

### 5. Link repositories

For every repository in the agreed scope, run `link-repo`.

Completion: every agreed repository is linked.

### 6. Add custom fields

For every field in the agreed scope, run `create-field` (single-select, multi-select, text, number, date, or iteration). Capture each field's node ID and, for select fields, its option IDs.

Completion: every agreed field exists with its options, and field and option IDs are captured for the item step.

### 7. Add views

For every view in the agreed scope, run `create-view` (board layout grouped by a field, or table layout).

Completion: every agreed view exists.

### 8. Add items

For every item in the agreed scope, run `add-item` (an existing issue or PR by node ID) or `add-draft` (a draft issue). Capture each item's node ID.

Completion: every agreed item is on the board.

### 9. Set item field values

For every agreed (item, field, value) triple, run `update-item-field`. Do this only after step 8 — you cannot add and update an item in the same call.

Completion: every agreed triple is set.

### 9b. Align metadata with issue labels and milestones

When the source item is an issue or PR that already carries labels or a milestone, make sure the board item fields and the issue metadata do not contradict each other. The board item should express the same Work Type, Repo Scope, Phase, Priority, Risk, Sprint, and Release Train story that the issue labels and milestone already imply.

### 10. Verify and report

Run `verify-board`. Confirm the title, linked repositories, fields, views, and item count all match the agreement. Report the board URL.

Completion: verification matches the agreement on every axis, and the URL is reported.

## Guardrails

- The GraphQL API cannot create Projects **automation rules** (workflows like "auto-add labeled issues" or "move to Done on close") — those are configured in the UI or via GitHub Actions. Say so rather than pretending to set them.
- `updateProjectV2ItemFieldValue` cannot change Assignees, Labels, Milestone, or Repository — those are properties of the issue or PR itself, set through the issue/PR APIs, not the project item.
- Adding an item that's already on the board returns the existing item — no duplicate.
- Global node IDs are required everywhere; never pass REST numeric IDs.

## Completion

- the skill's completion criteria are explicitly checked
- the structured result is returned and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml