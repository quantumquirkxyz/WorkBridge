# Vertical Slicing — Tracer-Bullet Rules

## Principle

Every ticket is broken into vertical slices that cut through all layers of the
stack: test, implementation, and validation. Each slice is independently
committable and demonstrable.

## Slice Anatomy

| Phase | Action | Exit condition |
|-------|--------|----------------|
| Red | Write a failing test at the agreed seam | Test fails for the right reason |
| Green | Implement the minimal code to pass | Test passes, nothing else |
| Validate | Run quality gates on the slice | gate-ide, gate-pre-commit pass |
| Commit | Conventional commit on issue branch | Pushed to origin |

## Rules

- One slice at a time. Do not batch multiple slices before committing.
- Each slice produces at least one test and one production code change.
- If a slice exceeds the 24-hour branch age limit, split it further.
- Slices are ordered by risk: highest-risk seam first.
- Incomplete features are behind feature flags (see `feature-flag` skill).
- Skip slices only when blocked; document the blocker in the artifact.

## Anti-patterns

- Horizontal layering (all tests first, then all code).
- Slices without tests.
- Merging without passing `gate-ci`.
