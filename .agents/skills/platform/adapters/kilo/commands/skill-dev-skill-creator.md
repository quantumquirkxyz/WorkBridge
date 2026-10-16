---
description: "Interactive interview and collaborative design tool that helps users define, research, name, generate, and validate complete Codex skills with SKILL.md, scripts, references, assets, ADRs, and traceability."
---
# skill-creator

When to use: Interactive interview and collaborative design tool that helps users define, research, name, generate, and validate complete Codex skills with SKILL.md, scripts, references, assets, ADRs, and traceability.

## Workflow

1. Read the canonical skill at .agents/skills/skill-dev/skill-creator/SKILL.md and execute its Process.

## Deliverables

- skill-dev artifact

## Guardrails

- risk: medium; trust tier: 3; approval required: yes
- side effects: write-files
- isolation: worktree; model tier: reasoning

Stop when: The user has completed the interview and generated a valid skill structure, or an existing skill has been validated with the supported tooling.
