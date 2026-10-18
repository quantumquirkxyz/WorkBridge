# ADR-0009: Name the product WorkBridge and track work in HackathonFISC/equipo-02

## Status

Accepted — 2026-10-17. Review if the product name or the repository owner changes.

## Context

The employability system was first named Puente Laboral Panamá, and ADR-0001 pointed governance
at the issue tracker `quantumquirkxyz/Agent-Hackathon`. The product in code, packages, and
`CONTEXT.md` is now WorkBridge, and the active remote is `HackathonFISC/equipo-02`. ADR-0002
and `docs/old/reference/agents/issue-tracker.md` still used the retired names, so an agent could
follow the wrong product identity or open work on a tracker this team does not use.

Issue #99 (part of #93) requires those documents to use the current name and tracker, and
requires this record of why.

## Decision

- The product name is **WorkBridge**. ADR-0002 describes the system under that name.
- The issue tracker is GitHub Issues in **`HackathonFISC/equipo-02`**. `CONTEXT.md` and
  `docs/old/reference/agents/issue-tracker.md` name that repository.
- This decision supersedes the tracker pointer in ADR-0001. ADR-0001 stays as the record of
  the original quirk Skills adoption; day-to-day routing follows this ADR.

## Consequences

- Project context, the system-boundary ADR, and the tracker configuration agree.
- `gh issue` and `gh pr` commands for this repository target `HackathonFISC/equipo-02`.
- Documents outside that set may still mention the retired names. They are historical records,
  not the active identity, and this issue does not rewrite them.

## Alternatives

- Keep Puente Laboral Panamá as the public name. Rejected: packages, the web app, and
  `CONTEXT.md` already shipped the WorkBridge rename, and a second public name would split
  the demo and the docs.
- Keep `quantumquirkxyz/Agent-Hackathon` as the tracker. Rejected: the team's queue and the
  git remote are `HackathonFISC/equipo-02`. Issues filed on the old slug would not be reviewed
  here.
- Rewrite every historical spec and ADR that mentions the old name in this change. Rejected:
  those files record decisions as they were made. The active identity is the three documents
  named in #99 plus this ADR.

## Links

- Issue #99, parent #93
- Supersedes the tracker pointer in ADR-0001
- Updates the product name stated in ADR-0002
- `CONTEXT.md`
- `docs/old/reference/agents/issue-tracker.md`
