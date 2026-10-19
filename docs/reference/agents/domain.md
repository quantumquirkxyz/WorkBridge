# Domain Docs

This repository uses a multi-context domain layout.

## Before exploring

1. Read `CONTEXT-MAP.md`.
2. Read the relevant context's `CONTEXT.md`, when it exists.
3. Read system-wide ADRs under `.agents/adr/`.
4. Read context-local ADRs when they exist.

If a context document does not exist, proceed without treating its absence as a blocker. Create it lazily when the domain is formalized.

## Vocabulary and conflicts

Use the vocabulary defined by the relevant context and the root `CONTEXT.md`. If a proposed output contradicts an existing ADR, state the conflict explicitly instead of silently overriding it.

## Layout

- Root context: `CONTEXT.md`
- Context map: `CONTEXT-MAP.md`
- System-wide decisions: `.agents/adr/`
- Context-specific decisions: a context-local `docs/adr/` directory when needed
