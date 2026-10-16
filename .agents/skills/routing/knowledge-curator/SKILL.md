---
name: "knowledge-curator"
category: "routing"
maturity: "stable"
version: "1"
description: "Keep context, ADRs, registry entries, and research coherent over time — with refresh and provenance discipline."
license: "MIT"
capabilities: ""
outputs: ""
sideEffects:
  - write-docs

dependencies: []
stopCondition: "Keep context, ADRs, registry entries, and research coherent over time complete; artifact saved; completion criteria checked."
risk: "low"
trustTier: "2"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "routing"
modelTier: "router"
evaluators: ["behavioral", "regression"]
fixturesPath: ""
diataxis: "how-to"
tags: ["routing"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: candidate updates, existing context, and ADRs.
- Output: the minimal durable update that preserves consistency.
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

Emit `KnowledgeCuratorArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/knowledge-curator/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Knowledge Curator

Use this skill to curate durable knowledge after a run.


## Steps

1. Compare candidate updates against existing context and ADRs.
2. Resolve contradictions or mark them for review.
3. Write only the minimal durable update needed.

## Memory conventions

The curator writes two different kinds of durable text. Confusing them is how a knowledge base rots: lessons get promoted into decisions they were never approved for, or decisions decay into one-line notes nobody can check.

| | Memory | Knowledge |
|---|---|---|
| What it is | One-line lessons a session learned, each linked to the session that produced it | The project's durable decisions: `CONTEXT.md`, ADRs, registry entries |
| Lifecycle | Accumulates across sessions, then gets consolidated and pruned | Changed deliberately, on demand, through review |
| Who owns it | The session that learned it, one entry at a time | The repository, through its review path |
| Shape | One line per entry with `[source: …; added: YYYY-MM-DD]` metadata and `[[path]]` cross-links | Full documents with headings, status, and provenance |

- Rule: memory records what a run learned; knowledge records what the project has decided. Cognition draws the same line for Devin — skills package the repeatable procedure while memory carries the preference or the reason behind a decision (devin.ai/blog/memory-and-dreaming). Once a lesson is promoted into an ADR or `CONTEXT.md`, retire the memory entry instead of duplicating it.
- Rule: every memory entry carries its source. Devin's memory drive stores notes as one-line bullets linked back to the session that learned them (docs.devin.ai/product-guides/memory; cognition.com/agent-memory-repo). An entry with no source cannot be checked, so it cannot be curated.
- Rule: keep the always-loaded index short. Devin loads `MEMORY.md` at session start and searches the other notes only when the task needs them; Letta keeps its core-memory blocks always in context and archives the rest behind retrieval (docs.letta.com/v1-sdk/memory/memory-blocks/). A manifest that grows is a manifest that stops being read.

### The commit boundary

- Rule: a memory edit is not memory until it is committed. Letta's MemFS model holds that edits become memory once they are committed and pushed (docs.letta.com/agent-sdk/memory), and Devin's memory drive is a Git repository where each session commits its edits and pushes; a stale write is rejected and retried rather than silently overwriting a newer revision (docs.devin.ai/product-guides/memory). In this repo the boundary is identical: write the durable update in the commit that carries the change it describes.
- Rule: a session that learns something and ends without committing it has produced nothing durable. The next session starts from the last commit, so an uncommitted lesson is a lost lesson.
- Rule: when two sessions touch the same memory file, the later write is checked against the newer revision and a conflict is surfaced for resolution, not merged by preference. For shared blocks, prefer appending a new entry over rewriting the block, because a full replacement is last-writer-wins (docs.letta.com/v1-sdk/memory/memory-blocks/).

### Flag-and-excise

- Rule: a poisoned or stale memory entry is excised, not merely flagged. Flagging leaves the payload live: the Bad Memory research (arXiv 2607.14611) shows payloads planted in `CLAUDE.md` and `AGENTS.md` persist in the session even when the model refuses to follow them (refusal rate 0%, persistence 100%).
- Rule: excision is recorded. Record what was removed, why, and which replacement entry took its place, so the removal is auditable rather than silent.
- Rule: revisit the memory set on the same cadence as the knowledge it feeds. Devin's dreaming pass consolidates overlapping notes, drops transient details, and removes stale records that no session used (devin.ai/blog/memory-and-dreaming); an entry nothing has read in a long time is a candidate for removal, not a permanent resident.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml