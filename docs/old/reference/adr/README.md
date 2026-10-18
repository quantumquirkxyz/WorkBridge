# ADRs

Architecture Decision Records. Mandatory directory for durable design decisions.

Reference: `.agents/adr/README.md` (canonical ADR entry point).
This directory (`docs/reference/adr/`) mirrors the repository-level design records.

Rules from `.agents/adr/README.md`:
- Must be created when using `/grill-with-docs`.
- Must reference `CONTEXT.md` vocabulary (now in repo root).
- Must not contain placeholders after publication.
- Must be reviewed before shipping.

Compatibility view: `.claude/skills/` is maintained as relative symlinks to `.agents/skills/` (see `.agents/AGENTS.md` and `README.md`).
