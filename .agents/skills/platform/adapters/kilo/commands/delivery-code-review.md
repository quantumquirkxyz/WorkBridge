---
description: "Review the changes since a fixed point (commit, branch, tag, or merge-base) along two axes - Standards and Spec - and publish findings only."
---
# code-review

When to use: Review the changes since a fixed point (commit, branch, tag, or merge-base) along two axes - Standards and Spec - and publish findings only.

## Workflow

1. Pin the fixed point
2. Identify the spec source
3. Identify the standards sources
4. Spawn both sub-agents in parallel
5. Aggregate

## Deliverables

- review artifact

## Guardrails

- risk: medium; trust tier: 3; approval required: yes
- side effects: post-pr-comment
- isolation: worktree; model tier: reasoning

Stop when: Review the changes since a fixed point (commit, branch, tag, or merge-base) along two axes - Standards and Spec - and publish findings only complete; structured result returned; completion criteria checked.
