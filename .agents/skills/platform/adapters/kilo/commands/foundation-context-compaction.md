---
description: "Run the context compaction discipline for long agent sessions: summarize the working set, clear stale tool results, and re-initiate a fresh window without losing the thread or the durable artifacts."
---
# context-compaction

When to use: Run the context compaction discipline for long agent sessions: summarize the working set, clear stale tool results, and re-initiate a fresh window without losing the thread or the durable artifacts.

## Workflow

1. **Inventory.** List the durable artifacts produced so far and where they live. List the open questions and the declared budget remaining
2. **Summarize.** Write a compact summary that carries: the task, the decisions made (with ADR references), the current seam, the next consumer, and the open questions
3. **Clear.** Identify tool results that are stale (file contents since edited, search results since consumed) and mark them re-derivable rather than re-reading them
4. **Preserve.** Persist the summary and any not-yet-artifactized decisions to a durable location (the session handoff file, `CONTEXT.md` when the decision is repo-local)
5. **Re-initiate.** Start the fresh window with the summary, the artifact references, and the declared budget. Record the compaction in the `CompactionReport`

## Deliverables

- compaction-report artifact

## Guardrails

- risk: low; trust tier: 2; approval required: no
- side effects: write-temp-file
- isolation: none; model tier: fast

Stop when: The session continues with a fresh window, every durable artifact preserved, and every dropped item either re-derivable or recorded as a risk.
