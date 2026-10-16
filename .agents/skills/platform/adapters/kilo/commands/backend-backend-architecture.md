---
description: "Shape backend systems — REST/gRPC APIs, service contracts, data flow, state management, error handling — with explicit seams and caller responsibilities."
---
# backend-architecture

When to use: Shape backend systems — REST/gRPC APIs, service contracts, data flow, state management, error handling — with explicit seams and caller responsibilities.

## Workflow

1. **Identify the domain model** — entities, aggregates, value objects
2. **Define API contracts** — request/response shapes, HTTP methods, status codes
3. **Choose transport protocol** — REST, gRPC, GraphQL, WebSocket
4. **Design service seams** — internal modules, data access layer
5. **Plan error handling** — typed errors, retry logic, circuit breakers
6. **Document the architecture** — ADR or README with diagrams

## Deliverables

- backend artifact

## Guardrails

- risk: low; trust tier: 1; approval required: no
- side effects: none
- isolation: none; model tier: reasoning

Stop when: Shape backend systems complete; artifact saved; completion criteria checked.
