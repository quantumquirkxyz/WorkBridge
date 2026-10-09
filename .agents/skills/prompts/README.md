# Prompt Templates

Versioned prompt templates for quirk Skills. Each skill may have multiple prompt versions under its own directory.

## Structure

```
.agents/skills/prompts/
├── README.md
├── implement/
│   ├── v1.md
│   └── v2.md
├── code-review/
│   ├── v1.md
│   └── v2.md
...
```

## Naming Convention

- Directory name matches skill name
- Files named `v1.md`, `v2.md`, etc.
- Each prompt file includes frontmatter with version, modelTier, and description

## Usage

Skills reference their prompt via `promptVersion` in frontmatter. The corresponding prompt template is loaded from this directory.
