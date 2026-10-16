---
description: Convert review-pr findings on a GitHub PR into a concrete remediation plan and post that plan as PR comments. Use after
---
# plan-review-fixes

When to use: Convert review-pr findings on a GitHub PR into a concrete remediation plan and post that plan as PR comments. Use after

## Workflow

1. Identify the PR
2. Capture review input
3. Normalize findings
4. Produce the plan
5. Post the PR comment

## Deliverables

- review artifact

## Guardrails

- risk: medium; trust tier: 3; approval required: yes
- side effects: post-pr-comment
- isolation: worktree; model tier: reasoning

Stop when: Convert review-pr findings on a GitHub PR into a concrete remediation plan and post that plan as PR comments complete; structured result returned; completion criteria checked.
