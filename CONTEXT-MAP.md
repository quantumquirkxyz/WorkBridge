# Context Map

This repository uses multiple domain contexts.

## System-wide context

- Vocabulary and project boundaries: `CONTEXT.md`
- System-wide decisions: `.agents/adr/`

## Contexts

| Context | Location | Context document | Status |
|---|---|---|---|
| Agent runtime | `apps/agent-runtime/` | `apps/agent-runtime/CONTEXT.md` | Pending creation |
| Web application | `apps/web/` | `apps/web/CONTEXT.md` | Pending creation |
| Domain | `packages/domain/` | `packages/domain/CONTEXT.md` | Pending creation |
| Catalog | `packages/catalog/` | `packages/catalog/CONTEXT.md` | Pending creation |
| Profile | `packages/profile/` | `packages/profile/CONTEXT.md` | Pending creation |
| Ingestion | `packages/ingestion/` | `packages/ingestion/CONTEXT.md` | Pending creation |
| Solver | `packages/solver/` | `packages/solver/CONTEXT.md` | Pending creation |
| Training | `packages/training/` | `packages/training/CONTEXT.md` | Pending creation |

Before exploring a context, read its local `CONTEXT.md` when it exists, then read the relevant ADRs under `.agents/adr/` and any context-local ADR directory.
