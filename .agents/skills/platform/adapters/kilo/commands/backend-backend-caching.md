---
description: "Design backend caching strategies — cache keys, TTLs, invalidation, stale-while-revalidate, and cache coherence — with explicit consistency and failure trade-offs."
---
# backend-caching

When to use: Design backend caching strategies — cache keys, TTLs, invalidation, stale-while-revalidate, and cache coherence — with explicit consistency and failure trade-offs.

## Workflow

1. Identify data, readers, writers, traffic shape, and freshness constraints
2. Decide cache placement: client, CDN, edge, service, shared store, or local memory
3. Define key format, value shape, TTL, and invalidation triggers
4. Analyze consistency risks, stampede risk, and failure behavior
5. Add observability: hit rate, latency, eviction, stale responses, and backend load
6. Document rollout, rollback, and cache-warming considerations

## Deliverables

- backend artifact

## Guardrails

- risk: low; trust tier: 1; approval required: no
- side effects: none
- isolation: none; model tier: reasoning

Stop when: Cache purpose, freshness, invalidation, and failure behavior are explicit.
