---
description: Promote validated experimental skills from the sandbox to the canonical skills bundle.
---
# skill-promoter

When to use: Promote validated experimental skills from the sandbox to the canonical skills bundle.

## Workflow

1. Validate Sandbox Skill
2. Warning Gate (Blocking)
3. Supply-Chain Gate (Blocking)
4. Prepare for Promotion
5. Update Canonical Bundle
6. Record Provenance
7. Verify Promotion

## Deliverables

- pull-request artifact

## Guardrails

- risk: medium; trust tier: 3; approval required: yes
- side effects: write-files, create-symlink, update-lockfile
- isolation: worktree; model tier: reasoning

Stop when: Promote validated experimental skills from the sandbox to the canonical skills bundle complete; artifact saved; completion criteria checked.
