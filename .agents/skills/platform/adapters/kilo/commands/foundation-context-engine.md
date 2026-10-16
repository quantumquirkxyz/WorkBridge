---
description: "Manage dynamic context for agent execution using retrieval-augmented generation patterns, updating the working context from sources beyond static CONTEXT.md (issues, PRs, docs, execution traces)."
---
# context-engine

When to use: Manage dynamic context for agent execution using retrieval-augmented generation patterns, updating the working context from sources beyond static CONTEXT.md (issues, PRs, docs, execution traces).

## Workflow

1. Parse query and identify relevant sources
2. Retrieve content from sources (files, issues, PRs, traces)
3. Index and synthesize
4. Detect changes since last index
5. Provide answer with source attribution

## Deliverables

- foundation artifact

## Guardrails

- risk: low; trust tier: 2; approval required: no
- side effects: none
- isolation: none; model tier: fast

Stop when: Context retrieved, indexed, and answer provided with explicit source attribution.
