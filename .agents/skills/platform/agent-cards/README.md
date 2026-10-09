# Agent Cards

Agent Cards enable A2A (Agent-to-Agent) discovery. Each JSON file in this directory is a self-contained card describing a quirk Skill.

## Usage

Generate all cards:
```bash
node .agents/skills/platform/scripts/generate-agent-cards.mjs
```

The script reads every skill under `.agents/skills/`, parses its frontmatter, and emits a card.

## Schema

See `.agents/skills/platform/schemas/agent-card-schema.json` for the JSON Schema.
