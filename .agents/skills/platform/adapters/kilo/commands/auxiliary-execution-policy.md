---
description: "Decide whether a Skill action is allowed, requires approval, or must stop."
---
# execution-policy

When to use: Decide whether a Skill action is allowed, requires approval, or must stop.

## Workflow

1. Classify the requested action as read, write, delete, network, or external write
2. Check the Skill manifest side effects and approval threshold
3. Require explicit approval for destructive or irreversible actions
4. Record the decision and rollback path

## Deliverables

- auxiliary artifact

## Guardrails

- risk: low; trust tier: 1; approval required: no
- side effects: none
- isolation: none; model tier: reasoning

Stop when: The action is allowed or blocked with reason, approval requirement is clear, and rollback is named.
