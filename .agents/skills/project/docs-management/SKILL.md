---
name: "docs-management"
category: "project"
maturity: "stable"
version: "1"
description: "Keep repository documentation, ADRs, and durable context aligned with the current project shape — with explicit consumer rules."
license: "MIT"
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Keep repository documentation, ADRs, and durable context aligned with the current project shape complete; structured result returned; completion criteria checked."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "adr"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ""
diataxis: "how-to"
tags: ["project"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: docs brief, repository context, and change scope.
- Output: docs guidance, ADR guidance, and context coherence notes.
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

Return `DocsManagementArtifact` as structured output in the current response. Do not write local artifact files unless the user explicitly asks for an export.


# 
# 
# Docs Management

Use this skill when the repository needs durable documentation discipline: what belongs in `CONTEXT.md`, when to write an ADR, and how to keep docs from drifting away from the code.


## Steps

1. Identify which durable docs are affected by the change.
2. Decide whether the change is glossary material, an ADR, or operational guidance.
3. Note what needs to stay coherent across future changes.
4. Flag any stale or contradictory material that should be removed or revised.

## Memory and knowledge

Documentation carries the project's decisions; memory carries what individual runs learned. The two have different lifecycles and different owners, and a repo that mixes them loses both.

- Rule: `CONTEXT.md` holds the vocabulary and the current project shape, ADRs hold decisions with their alternatives, and run memory holds one-line lessons. An entry in the wrong tier is curation work, not new content.
- Rule: promote a lesson into a document only when it has been accepted as a decision, and retire the memory entry at that point. Cognition draws the same boundary for Devin — a skill packages the repeatable procedure while memory carries the preference or reason behind it (devin.ai/blog/memory-and-dreaming).
- Rule: docs change deliberately through review; memory appends. A doc edit nobody reviewed is a decision smuggled in.
- Rule: a memory entry with no source cannot be checked, so it cannot be curated; require the session link and the date on every entry (cognition.com/agent-memory-repo).

## Two-tier context

Always-in-window context and on-demand context are different budgets, and they fail differently: the first one bloats every turn, the second one goes stale in the dark.

- **Tier 0 — the manifest.** The index every session loads: what exists, where it lives, and when it matters.
- **Tier 1 — the detail.** ADR bodies, reference files, skill bodies, and run records, read only when a pointer fires.

The tiering is proven practice rather than a local invention: Devin loads `MEMORY.md` at session start and reads deeper notes only when the task needs them (docs.devin.ai/product-guides/memory), and Letta keeps its core-memory blocks always in context while external memory stays behind retrieval (docs.letta.com/v1-sdk/memory/memory-blocks/).

- Rule: every tier-1 document is reachable from the tier-0 manifest by a pointer that names the trigger for reading it. An unreachable document is weight without reach.
- Rule: a pointer no session ever follows has stopped earning its load; prune the pointer before pruning the document it protects.
- Rule: a tier-1 document that is read on every task anyway is mis-tiered; promote it deliberately instead of paying a retrieval step each time.

## The T0 manifest

- Rule: the T0 manifest holds only what every session needs, plus links to everything else. Keep it short enough that it is always read in full (cognition.com/agent-memory-repo).
- Rule: every manifest line names the artifact, its owner, and the condition that makes it relevant, so a reader knows whether to follow the link now or later.
- Rule: the manifest is generated from the artifacts it indexes rather than hand-maintained beside them, so it cannot drift from what it points at.
- Rule: when a document is added, renamed, or retired, the manifest changes in the same commit as the document.
- Rule: the manifest is a map, not a contract. It says where guidance lives; the guidance itself keeps its own source of truth.

## Completion

- the skill's completion criteria are explicitly checked
- the structured result is returned and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml