---
adr: 0001
status: accepted
date: 2026-10-09
---

# Adopt the quirk Skills bundle in Agent-Hackathon

## Context

`Agent-Hackathon` starts from an empty repository (only `README.md` and `LICENSE`).
The project needs a repeatable way to move from intent to validated delivery: clarify scope,
preserve context, split work into claimable slices, review on separate Standards and Spec
axes, and ship only on clean evidence. Doing this ad hoc would let context drift and make
routing decisions untraceable.

The canonical bundle lives at `https://github.com/quantumquirkxyz/skills-quirk`; a local
checkout was used as the install source (`greenfield` adoption prompt).

## Decision

- Install the quirk Skills bundle into this repository:
  - `.agents/skills/**` (canonical skill definitions)
  - `.claude/skills/**` (relative-symlink compatibility view)
  - `skills-lock.json`, `skills.json`, `.env.template`
  - `docs/reference/agents/**`, `docs/how-to/**`, `docs/explanation/**`, `docs/tutorial/**`
  - `.agents/adr/README.md` (mandatory ADR entry point)
- Keep the repository's own `README.md`; do not overwrite it with the bundle README.
- Add a repository-local `CONTEXT.md` that names only this project's domain.
- Point the governance issue tracker at `quantumquirkxyz/Agent-Hackathon`.
- Validate with `node .agents/skills/platform/check-all.mjs` (expected `status: "pass"`).

## Consequences

- The repo is a valid quirk state: `ask-to` routing and the canonical feature flow
  (`grill-with-docs` → `to-spec` → `to-tickets` → `implement` → `publish-open-pr` →
  `review-pr` → `ship-subissue`) are available.
- `CONTEXT.md` starts in bootstrap state; its vocabulary table must be completed in the
  first `grill-with-docs` session before any spec is written.
- Bundle updates are synchronized later with the *existing-repository* prompt, which
  protects `CONTEXT.md`, `README.md`, and ADRs.
- Validation depends on the `docs/tutorial/**` and `docs/README.md` files that wiki links
  reference; do not delete them without fixing those links.

## Alternatives

- No bundle (ad hoc workflow): rejected — context drift and untraceable routing.
- Copy the bundle README over the repository README: rejected — loses the project's own
  entry point and adds noise.
- Fork the method docs: rejected — the method should stay identical to upstream so updates
  remain simple.
