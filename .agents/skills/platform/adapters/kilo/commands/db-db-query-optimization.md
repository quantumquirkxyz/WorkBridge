---
description: "Optimize database queries — indexing, query plans, cardinality, joins, and execution trade-offs — with explainable reasoning and measurement."
---
# db-query-optimization

When to use: Optimize database queries — indexing, query plans, cardinality, joins, and execution trade-offs — with explainable reasoning and measurement.

## Workflow

1. Capture the query, schema, indexes, engine/version, parameters, and observed latency
2. Review the execution plan for scans, join strategy, sorting, spills, and misestimated cardinality
3. Identify the dominant bottleneck and likely cause
4. Compare candidate fixes: rewrite, index, statistics update, denormalization, or pagination change
5. Recommend the smallest change with expected impact and trade-offs
6. Define a before/after validation plan and rollback considerations

## Deliverables

- db artifact

## Guardrails

- risk: low; trust tier: 1; approval required: no
- side effects: none
- isolation: none; model tier: reasoning

Stop when: The bottleneck, proposed change, and validation plan are explicit.
