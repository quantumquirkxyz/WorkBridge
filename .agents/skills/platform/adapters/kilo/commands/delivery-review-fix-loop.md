---
description: "Orchestrate the PR repair loop: run review-pr, use plan-review-fixes when findings exist, use implement-review-fixes to apply them, and repeat until the PR is clean or blocked. This skill coordinates the loop only."
---
# review-fix-loop

When to use: Orchestrate the PR repair loop: run review-pr, use plan-review-fixes when findings exist, use implement-review-fixes to apply them, and repeat until the PR is clean or blocked. This skill coordinates the loop only.

## Workflow

1. Run review-pr
2. Decide
3. Plan
4. Implement
5. Repeat

## Deliverables

- review artifact

## Guardrails

- risk: medium; trust tier: 3; approval required: yes
- side effects: write-code, post-pr-comment, commit-git, push-branch
- isolation: worktree; model tier: reasoning

Stop when: Orchestrate the PR repair loop: run review-pr, use plan-review-fixes when findings exist, use implement-review-fixes to apply them, and repeat until the PR is clean or blocked complete; artifact saved; completion criteria checked.
