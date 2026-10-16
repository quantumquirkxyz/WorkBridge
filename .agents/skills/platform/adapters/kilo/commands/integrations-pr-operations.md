---
description: "Manage pull request operations with branch, diff, validation, reviewer, label, comment, and publication evidence while keeping merge decisions explicit."
---
# pr-operations

When to use: Manage pull request operations with branch, diff, validation, reviewer, label, comment, and publication evidence while keeping merge decisions explicit.

## Workflow

1. Identify the repository, head branch, base branch, and desired operation: create, update title, update body, comment, label, request review, mark ready, or report status
2. Inspect current PR state or search for an existing PR matching the branch pair
3. Inspect the relevant diff, recent commits, and validation evidence when the operation changes the PR narrative or review readiness
4. Draft the exact PR title, body, comment, labels, or review requests before applying them
5. Apply only the requested PR mutations and avoid combining unrelated review coordination work
6. Re-read or verify the PR after mutation when tooling allows it
7. Summarize the final PR state, including what changed, what was validated, and what remains for reviewers

## Deliverables

- pull-request artifact

## Guardrails

- risk: medium; trust tier: 3; approval required: yes
- side effects: none
- isolation: none; model tier: reasoning

Stop when: Requested PR actions are completed or explicitly skipped, target PRs are identified, and validation or readiness evidence is reported.
