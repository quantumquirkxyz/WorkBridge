---
description: "Run and interpret the skill bundle quality gate across schema, lockfile, semantic, routing, placeholder, rule, metadata, and side-effect checks before promotion or publication."
---
# skill-quality-gate

When to use: Run and interpret the skill bundle quality gate across schema, lockfile, semantic, routing, placeholder, rule, metadata, and side-effect checks before promotion or publication.

## Workflow

1. Identify changed skills and metadata files from git status or the user's scope
2. Discover repository validation scripts under the skills platform directory
3. Run structural, lockfile, semantic, and all-in-one gates when available
4. Inspect output for warnings that should be promoted to blockers due to the requested release or promotion context
5. If failures occur, map each failure to the responsible skill path and likely repair
6. Return a compact readiness decision: ready, ready with warnings, or blocked

## Deliverables

- skill-dev artifact

## Guardrails

- risk: low; trust tier: 1; approval required: no
- side effects: none
- isolation: none; model tier: reasoning

Stop when: Quality gate commands are executed or blocked with reasons, findings are separated into blockers and warnings, and release readiness is stated.
