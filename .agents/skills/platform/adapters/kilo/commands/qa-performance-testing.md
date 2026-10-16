---
description: "Design and execute performance tests — load, stress, soak, spike — to validate latency, throughput, and resource consumption under realistic conditions."
---
# performance-testing

When to use: Design and execute performance tests — load, stress, soak, spike — to validate latency, throughput, and resource consumption under realistic conditions.

## Workflow

1. **Define SLIs and targets** — what is "fast enough"
2. **Create test scenarios** — representative user journeys
3. **Set up test environment** — mirror production configuration
4. **Run baseline tests** — measure under normal conditions
5. **Stress incrementally** — increase load until breaking point
6. **Analyze results** — find bottlenecks, graph correlations
7. **Set regression thresholds** — gate CI on performance

## Deliverables

- test-strategy artifact

## Guardrails

- risk: low; trust tier: 1; approval required: no
- side effects: none
- isolation: none; model tier: reasoning

Stop when: Design and execute performance tests complete; artifact saved; completion criteria checked.
