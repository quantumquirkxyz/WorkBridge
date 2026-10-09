# Issue Tracker

## Tracker

GitHub Issues in `quantumquirkxyz/Agent-Hackathon` are the issue tracker for this repo.

## Workflow

- Create and update issues with `gh issue`.
- Publish linked work items in issue order when a skill expects tracker-backed handoff.
- Use `gh pr` for PR publication and review metadata when a skill hands off to code review or shipment.

## Defaults

- Default tracker labels for spec publication: `spec`, `ready-for-agent`.
- Default tracker labels for tickets: `ready-for-agent` plus any justified area or priority labels inherited from the source spec.
- Keep milestones, project items, and fields aligned with the canonical work-item format.

## Wayfinding operations

- `to-spec` publishes one spec issue.
- `to-tickets` publishes tracer-bullet tickets with explicit blockers.
- `publish-open-pr` publishes a prepared branch as a PR.
- `ship-subissue` merges a clean subissue PR and closes the linked issue when needed.

## Notes

- PRs are not treated as a general request surface unless a skill explicitly says so.
