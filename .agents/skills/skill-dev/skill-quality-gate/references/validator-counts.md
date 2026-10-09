# Validator Count Notes

Different platform commands can report different counts without indicating a failure.

## Expected differences

| Command | What it counts |
|---|---|
| `validate-skills.mjs` | Canonical skill definitions that participate in structural validation and lock/symlink parity |
| `audit-semantics.mjs` | Markdown surfaces relevant to semantic checks, including canonical skills and additional platform or compatibility documents |
| `evaluate-scenarios.mjs` | Scenario fixture files under `evaluate-skill/scenarios/` |
| `evaluate-behavioral-fixtures.mjs` | Behavioral fixture files explicitly registered in the evaluator |
| `check-all.mjs` | Aggregated command results, not a unique skill count |

## How to interpret

- Treat nonzero warnings or errors as actionable.
- Treat count changes as informational when all checks pass and the change matches added or removed skills, fixtures, or platform surfaces.
- Treat unexpected count drops as suspicious when paired with missing symlinks, lockfile removals, or deleted fixture files.
- Mention count differences in release notes when they are user-visible, such as adding scenario coverage.
