---
name: "issue-operations"
category: "integrations"
maturity: "stable"
version: "1"
description: "Manage issue tracker operations with scoped target resolution, duplicate checks, mutation evidence, and rollback notes for create, update, comment, label, link, assign, and close actions."
capabilities: ""
outputs: ""
sideEffects: ""
dependencies: ""
stopCondition: "Requested issue tracker actions are completed or explicitly skipped, each target issue is identified, and the user receives evidence for every mutation."
risk: "medium"
trustTier: "3"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "integrations"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/issue-operations.json"
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

Emit `IssueOperationsArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/issue-operations/{identifier}.json`
- Markdown view: same filename with `.md` extension


## 
## 
## Rules

- Rule: resolve the tracker, repository or project, and exact issue target before mutating anything.
- Rule: search for existing issues before creating a new one when the work item may already exist.
- Rule: keep the operation narrow; apply only the labels, assignees, milestone, title, body, comments, links, or state changes requested by the user or required by a referenced workflow.
- Rule: preserve the user's language and intent in issue text while making acceptance criteria, blockers, and evidence explicit.
- Rule: never close, reopen, lock, delete, or transfer an issue as a side effect of summarizing or triaging unless the user requested that exact operation.
- Rule: after every mutation, capture the issue number or stable ID, URL, final state, and any API or validation response that proves the action completed.
- Rule: if a partial failure occurs, stop broadening the mutation set and report which issue actions succeeded, which failed, and what remains safe to retry.
- Rule: use `references/operation-summary-template.md` for user-facing summaries when more than one issue action is performed.
- Rule: consult `references/tracker-provider-guidelines.md` before mapping generic issue actions to GitHub, GitLab, Linear, Jira, or another tracker.

## Workflow

1. Identify the issue system and target scope from the user's request, linked work item, repository remote, or project metadata.
2. Normalize the requested operation into one or more explicit actions: create, update body, edit title, comment, label, assign, link, close, reopen, or move state.
3. Perform read-only checks first: confirm the target exists, look for duplicate open issues, and read the current labels, assignees, state, and most recent relevant discussion.
4. Draft the exact mutation content before applying it. For new issues, include a concise title, context, acceptance criteria, validation expectations, and known blockers.
5. Apply the smallest safe mutation set. Avoid bundling unrelated changes into one issue operation when separate evidence would be clearer.
6. Verify the final issue state by reading the target after mutation when the available tool supports it.
7. Return a compact summary with links, IDs, changes made, skipped actions, and recommended next steps.

## References

- `references/operation-summary-template.md` - reusable issue operation summary format.
- `references/tracker-provider-guidelines.md` - provider-specific mapping notes and safety checks.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml