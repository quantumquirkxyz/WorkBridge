---
description: "Design backend queues and background job systems — durability, retries, ordering, idempotency, and backpressure — with explicit delivery guarantees."
---
# backend-queues

When to use: Design backend queues and background job systems — durability, retries, ordering, idempotency, and backpressure — with explicit delivery guarantees.

## Workflow

1. Identify producers, consumers, payload shape, and ownership boundaries
2. Choose ordering, durability, acknowledgement, and retention semantics
3. Design retry, timeout, dead-letter, and replay behavior
4. Define idempotency keys and deduplication or compensation rules
5. Plan scaling, backpressure, rate limits, and worker shutdown behavior
6. Specify logs, metrics, alerts, and runbook checks

## Deliverables

- queue-design artifact

## Guardrails

- risk: low; trust tier: 1; approval required: no
- side effects: none
- isolation: none; model tier: reasoning

Stop when: Queue behavior, recovery paths, and operator signals are explicit.
