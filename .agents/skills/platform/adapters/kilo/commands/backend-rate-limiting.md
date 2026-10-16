---
description: "Rate limiting and throttling (token bucket, sliding window, distributed rate limiting, API protection)."
---
# rate-limiting

When to use: Rate limiting and throttling (token bucket, sliding window, distributed rate limiting, API protection).

## Workflow

1. Identify protected resources and clients
2. Choose rate limiting algorithms
3. Define limit tiers and rules
4. Design distributed coordination
5. Plan error handling and graceful degradation
6. Configure observability and alerting

## Deliverables

- backend artifact

## Guardrails

- risk: medium; trust tier: 3; approval required: yes
- side effects: none
- isolation: none; model tier: reasoning

Stop when: Rate limiting algorithms, limit tiers, distributed coordination, and API protection rules are explicit.
