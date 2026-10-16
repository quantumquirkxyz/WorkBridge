---
description: "Route work to the best matching Skill using declared capabilities and compatibility — with explicit selection rules."
---
# capability-router

When to use: Route work to the best matching Skill using declared capabilities and compatibility — with explicit selection rules.

## Workflow

1. Parse the task intent and required artifact type
2. Match against declared capabilities and side effects
3. Ask `skill-graph.mjs` to rank the candidate set: `node .agents/skills/platform/skill-graph.mjs rank "<query>" --json`, or read the persisted graph at `.agents/skills/platform/graph/skill-graph.json`
4. Prefer the thinnest Skill that can finish the work; use neighborhood activation only to break near-ties and to pull declared prerequisites
5. Fall back to a human-readable rationale when multiple Skills fit

## Deliverables

- plan artifact

## Guardrails

- risk: low; trust tier: 1; approval required: no
- side effects: none
- isolation: none; model tier: router

Stop when: Route work to the best matching Skill using declared capabilities and compatibility complete; structured result returned; completion criteria checked.
