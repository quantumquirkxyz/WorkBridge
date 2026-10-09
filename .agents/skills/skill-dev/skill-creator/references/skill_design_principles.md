# Skill Design Principles

Use this local reference when creating or reviewing generated skills.

## Principles

- Start with explicit inputs, outputs, side effects, dependencies, and a checkable stop condition.
- Prefer a focused skill over a broad utility that hides several workflows.
- Keep side effects honest and bounded to the paths the skill owns.
- Put durable artifact templates beside the skill that owns the artifact shape.
- Design for validation with scenarios, behavioral fixtures, and a concrete completion check.
- Preserve backwards-compatible script flags when adding localized aliases.

## Quality Checklist

- Frontmatter uses canonical quirk keys.
- `SKILL.md` explains the contract, workflow, guardrails, and completion criteria.
- `references/`, `scripts/`, `assets/`, and `adrs/` exist when the skill creates files or templates.
- Examples are runnable from the repository root.
- Generated skills include traceability for whether they came from interview mode, script mode, or the traditional worksheet flow.
