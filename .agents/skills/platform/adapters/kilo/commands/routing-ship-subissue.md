---
description: "Use when a finished subissue already has a clean PR and you need to merge it, mark it as completed, and close the linked issue — with release discipline."
---
# ship-subissue

When to use: Use when a finished subissue already has a clean PR and you need to merge it, mark it as completed, and close the linked issue — with release discipline.

## Workflow

1. Confirm the target
2. Confirm review is clean
3. Merge the PR
4. Close or complete the issue
5. Record completion

## Deliverables

- routing artifact

## Guardrails

- risk: high; trust tier: 4; approval required: yes
- side effects: merge-pull-request, close-issue, update-project
- isolation: none; model tier: router

Stop when: Use when a finished subissue already has a clean PR and you need to merge it, mark it as completed, and close the linked issue complete; structured result returned; completion criteria checked.
