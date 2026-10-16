---
description: "Optimize XR performance — frame rate, motion-to-photon latency, asset budgets, and thermal constraints — with comfort-aware trade-offs."
---
# xr-performance

When to use: Optimize XR performance — frame rate, motion-to-photon latency, asset budgets, and thermal constraints — with comfort-aware trade-offs.

## Workflow

1. Identify device, runtime, target frame rate, interaction mode, and scene constraints
2. Capture baseline profiling for CPU, GPU, memory, frame timing, and thermals
3. Identify dominant bottlenecks and comfort risks
4. Recommend optimizations: LODs, batching, occlusion, shader simplification, asset budgets, foveation, or interaction changes
5. Define acceptance tests on target hardware
6. Document trade-offs and regression checks

## Deliverables

- xr artifact

## Guardrails

- risk: low; trust tier: 1; approval required: no
- side effects: none
- isolation: none; model tier: reasoning

Stop when: XR performance targets, profiling evidence, and comfort trade-offs are explicit.
