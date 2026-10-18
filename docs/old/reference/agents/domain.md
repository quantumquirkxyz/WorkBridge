# Domain Docs

## Layout

```mermaid
flowchart TD
    A[Repo root] --> B[CONTEXT.md]
    A --> C[docs/reference/adr/]
    C --> D[ADR files]
    B --> E[Primary durable context]
    D --> F[Architectural decisions]
    E --> G[Domain vocabulary]
    F --> G
```

## Consumer rules

- Keep `CONTEXT.md` at the repo root as the primary durable context file.
- Keep ADRs under `docs/reference/adr/` when the repo adopts architectural decisions.
- Read durable docs before tactical ticket or implementation details when a skill depends on project vocabulary.

## Notes

- This repo currently uses a single repository context rather than multiple context partitions.
