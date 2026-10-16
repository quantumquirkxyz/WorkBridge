---
description: "Review a pull request against the fixed point the user supplies, separating Standards and Spec findings into distinct ax"
---
# review-pr

When to use: Review a pull request against the fixed point the user supplies, separating Standards and Spec findings into distinct ax

## Workflow

1. Pin the fixed point
2. Identify the spec source
3. Identify the standards sources
4. Spawn both sub-agents in parallel
5. Aggregate
6. Publish the review on the PR

## Deliverables

- review artifact

## Guardrails

- risk: medium; trust tier: 3; approval required: yes
- side effects: post-pr-comment
- isolation: worktree; model tier: reasoning

Stop when: Review a pull request against the fixed point the user supplies, separating Standards and Spec findings into distinct ax complete; structured result returned; completion criteria checked.
