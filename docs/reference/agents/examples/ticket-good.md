# Example Ticket

## Parent

Spec issue or local spec path.

## What to build

Make structured work-item validation available from the platform check command.

## Metadata

- Labels: `ready-for-agent`
- Milestone: none
- Project: none
- Fields: `work_type` = Ticket; `repo_scope` = platform; `phase` = ready-for-agent; `priority` = medium; `risk` = medium; `sprint` = none; `release_train` = none

## Acceptance criteria

- [ ] `check-all.mjs` runs the semantic audit.
- [ ] The semantic audit reports retired names as errors outside allowed provenance docs.

## Validation

- `node .agents/skills/platform/check-all.mjs`

## Blocked by

- None - can start immediately.

## Notes

- Do not add network dependencies.
