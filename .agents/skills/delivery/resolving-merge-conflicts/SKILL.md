---
name: "resolving-merge-conflicts"
category: "delivery"
maturity: "stable"
version: "1"
description: "Use when you need to resolve a conflicted or blocked branch state: in-progress git merge/rebase conflicts, PR branch corrections, or other branch-state blockers that need deliberate resolution."
capabilities: ""
outputs: ""
sideEffects:
  - write-code
  - commit-git
  - continue-merge-or-rebase

dependencies: []
stopCondition: "Use when you need to resolve a conflicted or blocked branch state: in-progress git merge/rebase conflicts, PR branch corrections, or other branch-state blockers that need deliberate resolution complete; artifact saved; completion criteria checked."
risk: "medium"
trustTier: "3"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "delivery"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/resolving-merge-conflicts.json"
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

Emit `ResolvingMergeConflictsArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/resolving-merge-conflicts/{identifier}.json`
- Markdown view: same filename with `.md` extension


## 
## 
## Rules

- Rule: inspect branch state and conflict source before editing files.
- Rule: preserve both intents where compatible and document trade-offs where they are not.
- Rule: never discard unrelated user changes while resolving conflicts.
- Rule: run the relevant checks after resolution and before committing.
- Rule: finish the merge or rebase process completely; do not leave the branch half-resolved.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml