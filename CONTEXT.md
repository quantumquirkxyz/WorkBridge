# Context

This repository (`Agent-Hackathon`) uses the repository-local quirk Skills bundle
installed under `.agents/skills/`. Durability rules and vocabulary for the workflow
itself live in `docs/explanation/quirk-method.md`; this file records the *project's own*
domain vocabulary and boundaries only.

## Repository role

- **Agent-Hackathon** is the working repository for an agent-focused build.
- It follows the quirk method: clarify before building, preserve context, split work into
  claimable slices, review on separate Standards and Spec axes, and ship only on clean evidence.
- The canonical skills are `.agents/skills/`; `.claude/skills/` is a symlink compatibility view.
- Durable design decisions are recorded as ADRs under `.agents/adr/`.

## Project vocabulary

> Status: **bootstrap**. The project brief has not been captured yet. This table is the
> single source of truth for the project's ubiquitous language and must be completed during
> the first `grill-with-docs` session before any spec is written. Do not invent terms here —
> every entry must be agreed with the owner.

| Term | Meaning |
|---|---|
| _pending_ | _To be defined in the first clarification session_ |

## Boundaries

- Domain terms from other repositories must not appear here.
- New terminology is added only through `grill-with-docs` / `domain-modeling`, each recorded
  as an ADR when the decision is hard to reverse.
- Stack, tracker, and validation commands are recorded below once confirmed.

## Stack (confirmed)

| Concern | Value |
|---|---|
| Language / runtime | _to confirm with project brief_ |
| Package manager | _to confirm_ |
| Issue tracker | GitHub Issues in `quantumquirkxyz/Agent-Hackathon` |
| Docs surface | `docs/reference/agents/`, `docs/how-to/`, `docs/explanation/` |
| ADRs | `.agents/adr/` |

## Maintenance rule

Keep this file limited to this repository's domain. Skills should reference it and avoid
vocabulary from unrelated repositories.
