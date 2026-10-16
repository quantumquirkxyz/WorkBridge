---
description: "Manage issue tracker operations with scoped target resolution, duplicate checks, mutation evidence, and rollback notes for create, update, comment, label, link, assign, and close actions."
---
# issue-operations

When to use: Manage issue tracker operations with scoped target resolution, duplicate checks, mutation evidence, and rollback notes for create, update, comment, label, link, assign, and close actions.

## Workflow

1. Identify the issue system and target scope from the user's request, linked work item, repository remote, or project metadata
2. Normalize the requested operation into one or more explicit actions: create, update body, edit title, comment, label, assign, link, close, reopen, or move state
3. Perform read-only checks first: confirm the target exists, look for duplicate open issues, and read the current labels, assignees, state, and most recent relevant discussion
4. Draft the exact mutation content before applying it. For new issues, include a concise title, context, acceptance criteria, validation expectations, and known blockers
5. Apply the smallest safe mutation set. Avoid bundling unrelated changes into one issue operation when separate evidence would be clearer
6. Verify the final issue state by reading the target after mutation when the available tool supports it
7. Return a compact summary with links, IDs, changes made, skipped actions, and recommended next steps

## Deliverables

- integrations artifact

## Guardrails

- risk: medium; trust tier: 3; approval required: yes
- side effects: none
- isolation: none; model tier: reasoning

Stop when: Requested issue tracker actions are completed or explicitly skipped, each target issue is identified, and the user receives evidence for every mutation.
