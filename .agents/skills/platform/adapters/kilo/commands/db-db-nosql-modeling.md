---
description: "Design NoSQL data models — document, key-value, wide-column, graph, time-series — with access pattern analysis, consistency requirements, and schema evolution."
---
# db-nosql-modeling

When to use: Design NoSQL data models — document, key-value, wide-column, graph, time-series — with access pattern analysis, consistency requirements, and schema evolution.

## Workflow

1. Identify access patterns — reads (by key, range, full-text, graph traversal) and writes (append, upsert, batch); frequency and latency requirements
2. Choose NoSQL type
3. Design data layout — document structure, key design (partition + sort), column families, graph topology
4. Consistency model — strong vs eventual; how does this affect correctness of reads?
5. Schema evolution — how are new fields / relationships added without downtime?
6. Scalability — partition/shard key; replication factor; read replicas; hot-key mitigation; backup and restore behavior
7. Deliver — artifact with access patterns, selected store type, data layout, consistency model, schema evolution plan, and scaling risks

## Deliverables

- model artifact

## Guardrails

- risk: low; trust tier: 1; approval required: no
- side effects: none
- isolation: none; model tier: reasoning

Stop when: Design NoSQL data models complete; required sections present; completion criteria checked.
