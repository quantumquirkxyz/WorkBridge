---
description: "Run a backtest with full audit hygiene — biases, costs, out-of-sample, regime splits — and produce a verdict on whether a strategy is robust."
---
# quant-backtest

When to use: Run a backtest with full audit hygiene — biases, costs, out-of-sample, regime splits — and produce a verdict on whether a strategy is robust.

## Workflow

1. Spec the strategy
2. Audit the data
3. Run the backtest
4. Stress tests
5. Coverage validation
6. Verdict
7. Deliver

## Deliverables

- test-strategy artifact

## Guardrails

- risk: low; trust tier: 1; approval required: no
- side effects: none
- isolation: none; model tier: reasoning

Stop when: Audit report complete with strategy spec, data audit, statistics, stress tests, and verdict.
