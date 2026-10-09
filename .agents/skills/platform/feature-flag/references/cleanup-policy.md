# Cleanup Policy

## Zombie Flag Detection

A flag is considered a zombie when:

- Its `status` is `completed` or `active` past the `cleanupDeadline`.
- It has no `cleanupDeadline` recorded.
- The owning team has not acknowledged the flag in the last two sprint cycles.

## Cleanup Rules

1. Every flag must have a `cleanupDeadline` of at most 4 weeks from activation.
2. The flag owner must file a cleanup ticket when the flag is promoted to `completed`.
3. The cleanup ticket must be merged before the `cleanupDeadline`.
4. If the deadline is missed, the flag is escalated to the team lead and marked `overdue`.
5. Flags marked `overdue` for more than 1 week are automatically disabled and flagged for removal.
6. No new feature work may depend on a flag that is `overdue`.

## Retirement Workflow

- Week 1: flag owner removes flag code paths and configuration.
- Week 2: PR is reviewed and merged; flag is deleted from the flag service.
- Week 3: verify no dead code, no stale targeting rules, and no references in documentation.
- Week 4: mark flag as `cleaned` in the registry.

## Audit

- Run zombie-flag detection weekly.
- Publish a cleanup report to the platform team channel.
- Track cleanup rate as a team health metric.
