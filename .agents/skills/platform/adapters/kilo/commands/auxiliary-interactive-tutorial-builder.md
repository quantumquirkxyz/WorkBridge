---
description: "Generate a focused tutorial with goals, exercise inputs, expected outputs, and checkpoints for any Skill; use when teaching or onboarding someone to a Skill."
---
# interactive-tutorial-builder

When to use: Generate a focused tutorial with goals, exercise inputs, expected outputs, and checkpoints for any Skill; use when teaching or onboarding someone to a Skill.

## Workflow

1. Read the target Skill contract and identify the learner's context
2. Generate the tutorial scaffold with `skill-lab.mjs tutorial`
3. Adapt the scenario, exercise input, and checkpoint to the learner
4. Add evidence requirements and common failure hints
5. Verify that the exercise still teaches the target Skill rather than a neighboring skill

## Deliverables

- auxiliary artifact

## Guardrails

- risk: low; trust tier: 2; approval required: no
- side effects: none
- isolation: none; model tier: fast

Stop when: The learner has a runnable exercise and a checkable checkpoint derived from the target Skill contract.
