---
description: "Maintain external agent memory: structured notes persisted outside the context window (NOW.md for the working thread, MEMORY.md for durable facts) so context can compact or reset while knowledge survives across sessions."
---
# agent-memory

When to use: Maintain external agent memory: structured notes persisted outside the context window (NOW.md for the working thread, MEMORY.md for durable facts) so context can compact or reset while knowledge survives across sessions.

## Workflow

1. **Record.** Before a compaction, reset, or handoff, write the working thread to NOW.md and promote anything durable to MEMORY.md or to an artifact
2. **Recall.** At session start, read NOW.md and MEMORY.md into the context pack (see `context-pack`) with their provenance lines
3. **Reconcile.** When a fact changes, update the entry and its provenance; never leave contradictory entries. Mark stale entries and remove them at the next reconciliation
4. **Promote.** When a memory entry becomes a decision, promote it to an ADR (see `docs-adrs`) and replace the memory entry with a reference

## Deliverables

- memory-state artifact

## Guardrails

- risk: low; trust tier: 2; approval required: no
- side effects: write-files
- isolation: worktree; model tier: fast

Stop when: Memory files are current, stale entries are reconciled, and every durable fact has a provenance line.
