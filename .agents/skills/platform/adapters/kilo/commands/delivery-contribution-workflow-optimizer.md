---
description: "Inspect changed Skills and recommend contribution improvements across standards, docs, tests, and examples; use when eva"
---
# contribution-workflow-optimizer

When to use: Inspect changed Skills and recommend contribution improvements across standards, docs, tests, and examples; use when eva

## Workflow

1. Identify base ref, changed Skill files, lockfile changes, and related docs
2. Run the PR check and repository validators
3. Inspect each changed Skill for contract clarity, side effects, outputs, dependencies, and completion criteria
4. Check examples, references, and tests for drift
5. Produce prioritized recommendations with evidence and owner-friendly wording

## Deliverables

- workflow artifact

## Guardrails

- risk: low; trust tier: 1; approval required: no
- side effects: none
- isolation: none; model tier: reasoning

Stop when: Inspect changed Skills and recommend contribution improvements across standards, docs, tests, and examples complete; structured result returned; completion criteria checked.
