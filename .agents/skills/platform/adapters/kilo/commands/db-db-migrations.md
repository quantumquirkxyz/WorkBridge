---
description: "Plan database migrations — schema changes, backfills, compatibility windows, and rollback strategy — with explicit application and data safety checks."
---
# db-migrations

When to use: Plan database migrations — schema changes, backfills, compatibility windows, and rollback strategy — with explicit application and data safety checks.

## Workflow

1. Map current readers, writers, constraints, indexes, triggers, and data volume
2. Define the target schema and compatibility hazards
3. Sequence the migration into reversible or forward-safe phases
4. Plan backfill mechanics, throttling, monitoring, and retry behavior
5. Write validation checks for counts, nullability, referential integrity, and application behavior
6. Document rollback or forward-fix actions for each phase

## Deliverables

- db artifact

## Guardrails

- risk: low; trust tier: 1; approval required: no
- side effects: none
- isolation: none; model tier: reasoning

Stop when: The migration sequence, compatibility window, validation, and rollback posture are explicit.
