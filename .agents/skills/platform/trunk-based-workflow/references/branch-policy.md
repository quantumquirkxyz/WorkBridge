# Branch Policy

## Branch Naming

- Use the pattern `<type>/<ticket-id>-<short-description>`.
  - Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`.
- Examples:
  - `feat/1234-add-user-auth`
  - `fix/5678-patch-login-redirect`
- Branch names must be lower-case with hyphens as separators.
- Avoid generic names like `patch`, `update`, or `wip`.

## Age Limits

- Feature branches must be merged within 24 hours of creation.
- Branches older than 24 hours at merge time trigger a violation.
- For long-running work, break the change into smaller, mergeable slices.
- Exception: release branches and hotfix branches are exempt from the 24-hour limit.

## PR Size

- Maximum 400 lines changed (additions + deletions) per PR.
- PRs exceeding the limit must be split into multiple smaller PRs.
- Count only meaningful code changes; exclude generated files, lock files, and formatting-only changes when possible.
- Split PRs at logical boundaries such as API contracts, schema changes, or feature toggles.

## Merge Strategy

- Default: `squash` — keeps trunk history clean and linear.
- Allowed: `merge-commit` — preserves full branch history when needed for audit.
- Prohibited: rebase after review, merge without CI green.

## Cleanup

- Delete the feature branch immediately after successful merge.
- Do not retain merged branches longer than 48 hours.
- Maintain a clean branch list to reduce cognitive load and merge-conflict surface.

## CI Gating

- CI must be green before merge; no exceptions without explicit approval.
- CI checks include lint, typecheck, unit tests, and integration tests.
- Block merge if any required check is red or pending.
