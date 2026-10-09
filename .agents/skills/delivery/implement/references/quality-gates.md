# Quality Gates Reference

This skill enforces three progressive quality gates. All must pass before the
branch is handed off for publication.

## gate-ide

Trigger: file-save event.

Checks:
- Lint and format on changed files only
- Typecheck on changed files only
- Spellcheck on changed files only
- Lightweight secret scan

Budget: fails fast; report to agent context.

## gate-pre-commit

Trigger: git-commit event.

Checks:
- Lint + typecheck on changed files only
- Unit tests for changed files only
- Lightweight dependency vulnerability check

Budget: 10 seconds max. Blocks commit on failure.

## gate-ci

Trigger: push-to-PR event.

Checks:
- Full unit suite
- Integration tests
- Contract tests
- Security scan (semgrep, snyk)
- Performance regression (k6)

Threshold: 80% line coverage minimum. Blocks merge on failure.

## Sequence

1. `gate-ide` on every file-save during implementation.
2. `gate-pre-commit` before each commit.
3. `gate-ci` before PR publication.

Do not proceed to `publish-open-pr` until `gate-ci` passes.
