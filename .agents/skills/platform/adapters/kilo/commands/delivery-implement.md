---
description: "Implement a piece of work based on a spec or set of tickets, or build a scoped fix that can be handed off for publication. This skill stops at the implemented, validated branch."
---
# implement

When to use: Implement a piece of work based on a spec or set of tickets, or build a scoped fix that can be handed off for publication. This skill stops at the implemented, validated branch.

## Workflow

1. Read the spec or ticket and confirm acceptance criteria are concrete
2. Identify the seam and create the issue branch
3. For each vertical slice
4. Run the full test suite and gate-ci

## Deliverables

- implementation artifact

## Guardrails

- risk: medium; trust tier: 3; approval required: yes
- side effects: write-code, commit-git, push-branch
- isolation: worktree; model tier: reasoning

Stop when: Implement a piece of work based on a spec or set of tickets, or build a scoped fix that can be handed off for publication complete; artifact saved; completion criteria checked.
