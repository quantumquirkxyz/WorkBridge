---
description: "Evaluate a Skill against fixed scenarios for routing, completion, and artifact validity."
---
# evaluate-skill

When to use: Evaluate a Skill against fixed scenarios for routing, completion, and artifact validity.

## Workflow

1. Load the Skill manifest and representative fixtures from `scenarios/`
2. Run the static scenario evaluator when deterministic validation is enough
3. Run the behavioral fixture evaluator after changing templates or artifact formats
4. Check routing, output shape, stop condition, and safety behavior
5. Check that the skill's contract matches the shape of its actual effects: routing-only skills should not write, write-capable skills should declare their side effects, and read-only skills should stay read-only
6. Record the failures as regression cases by adding or updating a scenario or behavioral fixture

## Deliverables

- skill-dev artifact

## Guardrails

- risk: low; trust tier: 1; approval required: no
- side effects: none
- isolation: none; model tier: reasoning

Stop when: Evaluate a Skill against fixed scenarios for routing, completion, and artifact validity complete; artifact saved; completion criteria checked.
