---
name: "agent-memory"
category: "foundation"
maturity: "experimental"
version: "1"
description: "Maintain external agent memory: structured notes persisted outside the context window (NOW.md for the working thread, MEMORY.md for durable facts) so context can compact or reset while knowledge survives across sessions."
license: "MIT"
capabilities:
  - maintain a NOW.md working thread for the active task
  - maintain a MEMORY.md of durable, cross-session facts
  - decide what belongs in memory versus in an artifact
  - recall memory into a fresh context pack with provenance
inputs:
  - a session that needs state to survive compaction, reset, or handoff
  - the repository's CONTEXT.md and ADRs (the repo-local vocabulary)
  - the current task and its artifacts
outputs:
  - type: object
    name: MemoryState
  properties:
    status: { type: string, enum: [recorded, recalled, reconciled] }
    nowEntries: { type: "array", items: { type: "string" } }
    memoryEntries: { type: "array", items: { type: "string" } }
    promotedToArtifact: { type: "array", items: { type: "string" } }
    staleEntries: { type: "array", items: { type: "string" } }
    nextConsumer: { type: "string" }
    riskRemaining: { type: "string" }
  required: [status, nextConsumer]
sideEffects:
  - write-files
dependencies:
  - context-pack
  - context-compaction
  - handoff
  - docs-knowledge-base
stopCondition: "Memory files are current, stale entries are reconciled, and every durable fact has a provenance line."
risk: "low"
trustTier: "2"
maxIterations: "5"
promptVersion: "1.0"
artifactType: "memory-state"
modelTier: "fast"
evaluators: ["behavioral", "regression"]
fixturesPath: .agents/skills/platform/fixtures/behavioral/agent-memory.json
diataxis: "how-to"
tags: ["memory", "context-engineering", "continuity"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: a session that needs state to survive a boundary (compaction, reset, handoff, model change).
- Output: a `MemoryState` reporting what was recorded, recalled, promoted, or reconciled.
- Scope: memory holds the thread and durable facts. Specs, tickets, PR bodies, and review plans are artifacts, not memory; memory references them.
- Rule: every memory entry carries a provenance line (source session, date, artifact reference). An entry without provenance is deleted, not kept.

## The two memory files

- **NOW.md** - the working thread: current task, decisions in flight, open questions, next step. Short by construction; it is re-entered every session and must fit in a few hundred tokens.
- **MEMORY.md** - durable facts: user preferences, repo invariants, recurring pitfalls, tool facts that are not in CONTEXT.md. Append-only with provenance; reconciled when stale.

## Procedure

1. **Record.** Before a compaction, reset, or handoff, write the working thread to NOW.md and promote anything durable to MEMORY.md or to an artifact.
2. **Recall.** At session start, read NOW.md and MEMORY.md into the context pack (see `context-pack`) with their provenance lines.
3. **Reconcile.** When a fact changes, update the entry and its provenance; never leave contradictory entries. Mark stale entries and remove them at the next reconciliation.
4. **Promote.** When a memory entry becomes a decision, promote it to an ADR (see `docs-adrs`) and replace the memory entry with a reference.

## Provenance

| Question | Answer |
|---|---|
| What is the source of truth? | The session thread, CONTEXT.md, ADRs, and the current task artifacts |
| What is in scope? | Record, recall, reconcile, and promote memory entries with provenance |
| What is explicitly out of scope? | Specs, tickets, and PR bodies: artifacts, referenced from memory, never copied |
| Who or what consumes this artifact afterward? | The next session via `context-pack`, `context-compaction`, or `handoff` |
| What evidence proves it is done? | MemoryState with recorded, recalled, promoted, and stale entries |
| What risk remains? | Stale entries reconciled late, or repo vocabulary duplicated from CONTEXT.md |

## Artifact

`MemoryState` with `status`, `nowEntries`, `memoryEntries`, `promotedToArtifact`, `staleEntries`, `nextConsumer`, and `riskRemaining`.

## Reference

- The canonical prompt for this skill is versioned at `.agents/skills/prompts/agent-memory/v1.md` (prompt version 1.0).
- Governing skills: see the dependencies in the frontmatter for the skills this one composes with.

Every execution is traced via `record-execution.mjs`. The trace includes traceId, spanId, model tier, duration, tool calls, and quality score.

## Rationale

Compaction and resets destroy working state unless something outside the window holds it. External memory (NOW.md for the thread, MEMORY.md for durable facts) is what lets context compress while knowledge survives across sessions, models, and handoffs.

## Completion

- NOW.md reflects the exact working thread; nothing in flight is memory-only.
- MEMORY.md entries are durable, provenance-carrying, and non-contradictory.
- Decisions live in ADRs; memory holds references, not copies.
- No approval is required for memory writes: NOW.md and MEMORY.md are repo-local Markdown files, reversible via git.

## Failure modes

- Memory as a dumping ground: if an entry does not survive compaction usefully, it is not memory.
- Duplicating CONTEXT.md: repo-local vocabulary belongs in CONTEXT.md; memory holds session-spanning facts only.
- Unbounded growth: reconcile MEMORY.md on every recall; cap NOW.md at a few hundred tokens.

---
@include .agents/skills/platform/contract-base.xml
