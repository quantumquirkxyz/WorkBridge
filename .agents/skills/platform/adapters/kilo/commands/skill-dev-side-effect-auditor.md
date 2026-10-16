---
description: "Audit skill side-effect, risk, trust tier, dependency, and boundary metadata against the actual workflow so mutating skills declare their operational authority honestly."
---
# side-effect-auditor

When to use: Audit skill side-effect, risk, trust tier, dependency, and boundary metadata against the actual workflow so mutating skills declare their operational authority honestly.

## Workflow

1. Select the skills in scope from git status, a release list, or a category requested by the user
2. Read each skill's frontmatter, contract, rules, workflow, and completion criteria
3. Extract implied operations and compare them with declared `sideEffects`, `risk`, `trustTier`, and dependencies
4. Classify each mismatch by severity: blocker, warning, or informational
5. Recommend exact frontmatter updates and, when needed, body rule changes that make operational authority explicit
6. Return a concise audit table or grouped list with paths and suggested changes

## Deliverables

- skill-dev artifact

## Guardrails

- risk: low; trust tier: 1; approval required: no
- side effects: none
- isolation: none; model tier: reasoning

Stop when: Side-effect mismatches are classified with recommended frontmatter changes or the audited skills are confirmed consistent.
