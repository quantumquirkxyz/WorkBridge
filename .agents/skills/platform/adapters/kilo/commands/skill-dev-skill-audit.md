---
description: "Audit the Skills bundle, lockfile, symlink parity, and contract drift — with actionable maintenance output."
---
# skill-audit

When to use: Audit the Skills bundle, lockfile, symlink parity, and contract drift — with actionable maintenance output.

## Workflow

1. Run the platform validator in `.agents/skills/platform/validate-skills.mjs`
2. Run the semantic auditor in `.agents/skills/platform/audit-semantics.mjs` when the audit includes templates, retired names, Markdown links, or contract drift
3. Inspect the output for missing canonical skills, broken `.claude/` links, and lockfile drift
4. Inspect the inventory for stale aliases or mismatched metadata that the validator may not classify crisply
5. Summarize findings as a prioritized maintenance report

## Deliverables

- skill-dev artifact

## Guardrails

- risk: low; trust tier: 1; approval required: no
- side effects: write-files
- isolation: worktree; model tier: reasoning

Stop when: Audit the Skills bundle, lockfile, symlink parity, and contract drift complete; artifact saved; completion criteria checked.
