# Spec Template Reference

Use this canonical shape for every spec produced by `to-spec`.

```markdown
# {Feature Name}

## Goals
- Goal 1
- Goal 2

## Non-Goals
- Out-of-scope item 1
- Out-of-scope item 2

## Acceptance Criteria
- [ ] Acceptance criterion one
- [ ] Acceptance Criterion 2

## Risks and Open Questions
- Risk 1 — mitigation
- Open question 1

## Decisions
- Decision 1 — rationale
```

## Field Definitions

| Field | Description |
|---|---|
| `title` | Short feature name; becomes the tracker issue title |
| `goals` | Ordered list of what the work achieves from the user's perspective |
| `nonGoals` | Explicitly out-of-scope items; prevents scope creep |
| `acceptanceCriteria` | Verifiable conditions that define "done" |
| `risks` | Known failure modes and their mitigations |
| `decisions` | Seam choices with rationale; one preferred seam, alternatives listed |
| `validationNotes` | How the spec was validated against the conversation |

## Rules

- Keep the template compact and traceable — no filler text.
- Use `TBD` only when an open question is explicitly accepted.
- Every decision must have a seam rationale tied to this repo's vocabulary: context, harness, loop, graph, data plane, execution plane, observability, safety boundaries.
- Acceptance criteria must be independently verifiable — no "and so on" or implied scope.
