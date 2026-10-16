---
description: "Generates and maintains Agent Cards for A2A (Agent-to-Agent) discovery."
---
# agent-card

When to use: Generates and maintains Agent Cards for A2A (Agent-to-Agent) discovery.

## Workflow

1. Read skill frontmatter from `.agents/skills/{category}/{skill}/SKILL.md`
2. Validate the extracted metadata against `agent-card-schema.json`
3. Emit AgentCard JSON to `.agents/skills/platform/agent-cards/{category}-{skill}.json`
4. Update `index.json` in the same directory
5. When the card leaves the repository, regenerate and sign the corpus with `--sign`, and record the key id alongside the release notes
6. Before consuming an external card, verify it with `--verify` against a pre-trusted public key, and refuse any card whose body does not verify

## Deliverables

- plan artifact

## Guardrails

- risk: low; trust tier: 1; approval required: no
- side effects: write-files
- isolation: worktree; model tier: router

Stop when: Agent Card JSON emitted to platform/agent-cards, index updated, and completion criteria checked.
