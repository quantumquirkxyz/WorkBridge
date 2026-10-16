---
description: "Maintain the skills lockfile by detecting missing, stale, extra, or mismatched skill entries and updating hashes only after the corresponding SKILL.md files are resolved."
---
# lockfile-maintenance

When to use: Maintain the skills lockfile by detecting missing, stale, extra, or mismatched skill entries and updating hashes only after the corresponding SKILL.md files are resolved.

## Workflow

1. Read the lockfile and list canonical skill files
2. Compare lock entries to the filesystem by skill name, path, and hash
3. Classify drift as missing entry, stale hash, extra entry, moved skill, duplicate name, or malformed metadata
4. Apply the smallest lockfile change that reconciles the intended tree
5. Validate the full skill bundle using the repository's available validation commands
6. Summarize every lockfile mutation and cite remaining drift, if any

## Deliverables

- skill-dev artifact

## Guardrails

- risk: low; trust tier: 2; approval required: no
- side effects: write-files
- isolation: worktree; model tier: fast

Stop when: Lockfile entries match the current skill tree or every drift item has a stated blocker and recommended repair.
