---
description: "Design relational schemas — entities, relations, keys, indexes, constraints — with normalisation, performance, and migration planning."
---
# db-relational-design

When to use: Design relational schemas — entities, relations, keys, indexes, constraints — with normalisation, performance, and migration planning.

## Workflow

1. Identify entities and relationships (1:1, 1:N, N:M)
2. Normalise to 3NF (at least); denormalise only for read-heavy patterns with justification
3. Define primary / foreign / composite / candidate keys; state uniqueness constraints
4. Design indexes for the query workload — primary access path, search patterns, reporting queries
5. Define constraints: NOT NULL, CHECK, UNIQUE, foreign-key actions (ON DELETE / UPDATE)
6. Migration plan: backward-compatible steps (add column, backfill, change constraint, drop old column / table); rollback steps
7. Performance: explain plan for critical queries; estimate size and growth
8. Deliver — artifact: schema diagram (text/table), entity descriptions, index justification, constraints, and migration script sequence

## Deliverables

- plan artifact

## Guardrails

- risk: low; trust tier: 1; approval required: no
- side effects: none
- isolation: none; model tier: reasoning

Stop when: Artifact complete with schema, indexes, constraints, and migration sequence.
