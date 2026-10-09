# Issue Template Reference

Use this canonical shape for every ticket produced by `to-tickets`.

```markdown
# {Ticket Title}

## Acceptance Criteria
- [ ] Acceptance criterion one
- [ ] Acceptance Criterion 2

## Validation
How to verify this ticket is complete.

## Blocked By
- #{issue_number} — {reason}
```

## Field Definitions

| Field | Description |
|---|---|
| `title` | Short, action-oriented name; starts with a verb |
| `acceptanceCriteria` | Verifiable conditions scoped to this slice only |
| `validation` | How a reviewer confirms the ticket is truly done |
| `blockedBy` | Issue numbers that must complete before this one starts; empty if none |

## Rules

- One ticket per file under `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01` in dependency order.
- Every ticket must be independently understandable and claimable by an agent with no prior context.
- The ticket body must be written in English and use the repo's domain glossary.
- Apply tracker defaults: `ready-for-agent` plus any area or priority labels inherited from the source spec.
