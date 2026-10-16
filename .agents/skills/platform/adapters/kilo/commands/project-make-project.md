---
description: "Use when the user wants a new board in GitHub Projects, or another skill needs one — create the project, wire its fields, and preserve tracker semantics."
---
# make-project

When to use: Use when the user wants a new board in GitHub Projects, or another skill needs one — create the project, wire its fields, and preserve tracker semantics.

## Workflow

1. Confirm the target
2. Resolve the owner's node ID
3. Check for an existing board
4. Create the board and set its defaults
5. Link repositories
6. Add custom fields
7. Add views
8. Add items

## Deliverables

- pull-request artifact

## Guardrails

- risk: medium; trust tier: 3; approval required: yes
- side effects: create-project, create-project-fields, link-repositories
- isolation: none; model tier: reasoning

Stop when: Use when the user wants a new board in GitHub Projects, or another skill needs one complete; structured result returned; completion criteria checked.
