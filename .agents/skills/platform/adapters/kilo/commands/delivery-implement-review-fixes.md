---
description: "Read a GitHub PR remediation plan produced by plan-review-fixes, implement the planned corrections through the repositor"
---
# implement-review-fixes

When to use: Read a GitHub PR remediation plan produced by plan-review-fixes, implement the planned corrections through the repositor

## Workflow

1. Identify the PR and branch
2. Read the current plan
3. Validate the plan against the current diff
4. Implement scoped fixes
5. Validate
6. Report completion on the PR

## Deliverables

- review artifact

## Guardrails

- risk: medium; trust tier: 3; approval required: yes
- side effects: write-code, commit-git, push-branch
- isolation: worktree; model tier: reasoning

Stop when: Read a GitHub PR remediation plan produced by plan-review-fixes, implement the planned corrections through the repositor complete; artifact saved; completion criteria checked.
