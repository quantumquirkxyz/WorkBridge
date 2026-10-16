---
description: "Compact the current conversation into a handoff document for another agent to pick up — with explicit continuity and ownership notes."
---
# handoff

When to use: Compact the current conversation into a handoff document for another agent to pick up — with explicit continuity and ownership notes.

## Workflow

1. Read the canonical skill at .agents/skills/routing/handoff/SKILL.md and execute its Process.

## Deliverables

- routing artifact

## Guardrails

- risk: low; trust tier: 2; approval required: no
- side effects: write-temp-file
- isolation: none; model tier: router

Stop when: Compact the current conversation into a handoff document for another agent to pick up complete; artifact saved; completion criteria checked.
