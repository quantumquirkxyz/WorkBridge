---
description: "Author deterministic scenario and behavioral fixtures for skills so routing, contracts, outputs, side effects, and refusal boundaries can be tested before promotion."
---
# workflow-fixture-author

When to use: Author deterministic scenario and behavioral fixtures for skills so routing, contracts, outputs, side effects, and refusal boundaries can be tested before promotion.

## Workflow

1. Inspect the target skill and nearby existing fixtures to infer naming, schema, and assertion style
2. Derive fixture coverage from the skill's contract, rules, dependencies, and completion criteria
3. Draft scenarios for happy path, ambiguous input, unsafe mutation, and completion evidence as appropriate
4. Draft behavioral expectations that forbid placeholders and require exact sections or fields that matter
5. Add or update fixture files in the correct location
6. Run the relevant fixture validator or explain why it cannot run locally
7. Summarize coverage added, validation result, and remaining gaps

## Deliverables

- authentication artifact

## Guardrails

- risk: low; trust tier: 2; approval required: no
- side effects: none
- isolation: none; model tier: fast

Stop when: Fixtures cover the requested skill behavior and either pass the relevant validator or list exact follow-up fixes.
