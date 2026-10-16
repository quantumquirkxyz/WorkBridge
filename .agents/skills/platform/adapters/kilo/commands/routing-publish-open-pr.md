---
description: "Use when the user wants to publish a finished subissue as an open GitHub pull request from an already-prepared issue branch — with scoped, auditable publication."
---
# publish-open-pr

When to use: Use when the user wants to publish a finished subissue as an open GitHub pull request from an already-prepared issue branch — with scoped, auditable publication.

## Workflow

1. Confirm scope
2. Verify prerequisites
3. Run gate-ci before opening PR
4. Run the smallest relevant validation
5. Prepare the PR bundle
6. Push the branch and open a PR
7. Hand off to the next workflow

## Deliverables

- pull-request artifact

## Guardrails

- risk: medium; trust tier: 3; approval required: yes
- side effects: push-branch, create-pull-request
- isolation: none; model tier: router

Stop when: Use when the user wants to publish a finished subissue as an open GitHub pull request from an already-prepared issue branch complete; structured result returned; completion criteria checked.
