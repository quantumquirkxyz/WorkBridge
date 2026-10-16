---
description: Ask which skill or flow fits your situation. A router over the skills in this repo that recommends the next step after governance preflight.
---
# ask-to

When to use: Ask which skill or flow fits your situation. A router over the skills in this repo that recommends the next step after governance preflight.

## Workflow

1. Read the canonical skill at .agents/skills/routing/ask-to/SKILL.md and execute its Process.

## Deliverables

- currentState
- selectedTransition
- nextSkill
- workflow

## Guardrails

- risk: low; trust tier: 1; approval required: no
- side effects: none
- isolation: none; model tier: router

Stop when: Ask which skill or flow fits your situation complete; structured result returned; completion criteria checked.
