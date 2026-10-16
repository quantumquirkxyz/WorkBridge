---
description: "Build a minimal fresh context pack with ordered reads and provenance — for scoped, high-signal handoff."
---
# context-pack

When to use: Build a minimal fresh context pack with ordered reads and provenance — for scoped, high-signal handoff.

## Workflow

1. Identify the task scope and the smallest authoritative docs needed
2. Order the reads from durable repo context to task-specific evidence
3. Record freshness, provenance, and budget in the pack
4. Capture the smallest set of facts needed to choose the next skill without reopening the full repo

## Deliverables

- routing artifact

## Guardrails

- risk: low; trust tier: 1; approval required: no
- side effects: none
- isolation: none; model tier: router

Stop when: Build a minimal fresh context pack with ordered reads and provenance complete; structured result returned; completion criteria checked.
