---
description: "Design microservice architectures — service decomposition, inter-service communication, data ownership, resilience patterns — with explicit boundaries and failure isolation."
---
# microservices

When to use: Design microservice architectures — service decomposition, inter-service communication, data ownership, resilience patterns — with explicit boundaries and failure isolation.

## Workflow

1. **Map the domain** — identify bounded contexts and aggregates
2. **Define service boundaries** — single responsibility, high cohesion
3. **Assign data ownership** — which service owns which data
4. **Choose communication style** — REST, gRPC, message queue, event bus
5. **Design resilience** — timeouts, retries, circuit breakers, bulkheads
6. **Plan observability** — distributed tracing, centralized logging

## Deliverables

- backend artifact

## Guardrails

- risk: low; trust tier: 1; approval required: no
- side effects: none
- isolation: none; model tier: reasoning

Stop when: Design microservice architectures complete; artifact saved; completion criteria checked.
