---
description: "Perform manual test sessions — exploratory checks, edge cases, accessibility, and user-visible regressions — with explicit reproduction notes."
---
# qa-manual-testing

When to use: Perform manual test sessions — exploratory checks, edge cases, accessibility, and user-visible regressions — with explicit reproduction notes.

## Workflow

1. Define the test charter and risk areas
2. Prepare environment, test data, permissions, and device/browser matrix
3. Execute core workflows before edge cases
4. Probe boundaries: empty states, invalid input, permission gaps, latency, and navigation
5. Document findings with reproduction steps and severity rationale
6. Summarize coverage, untested areas, and follow-up recommendations

## Deliverables

- test-strategy artifact

## Guardrails

- risk: low; trust tier: 1; approval required: no
- side effects: none
- isolation: none; model tier: reasoning

Stop when: Tested paths, environment, findings, and residual risks are documented.
