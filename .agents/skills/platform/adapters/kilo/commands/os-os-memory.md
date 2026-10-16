---
description: "Design operating system memory systems — virtual memory, paging, allocation, swapping, and protection — with explicit resource accounting and locality assumptions."
---
# os-memory

When to use: Design operating system memory systems — virtual memory, paging, allocation, swapping, and protection — with explicit resource accounting and locality assumptions.

## Workflow

1. Identify process memory layout, allocation pattern, limits, and workload shape
2. Separate virtual, resident, shared, heap, stack, mapped, and cached memory concerns
3. Analyze paging, locality, fragmentation, copy-on-write, and swapping behavior
4. Identify protection and isolation assumptions
5. Recommend mitigation: allocation strategy, batching, limits, pooling, profiling, or architecture change
6. Define measurements that would validate the recommendation

## Deliverables

- os artifact

## Guardrails

- risk: low; trust tier: 1; approval required: no
- side effects: none
- isolation: none; model tier: reasoning

Stop when: Memory layout, resource limits, and protection/locality trade-offs are explicit.
