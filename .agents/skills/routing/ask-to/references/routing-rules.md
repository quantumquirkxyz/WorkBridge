# Routing Decision Rules

These rules govern how `ask-to` selects a downstream skill.

## Selection criteria

1. Always prefer the thinnest skill that can finish the work.
2. If the request may mutate tracker metadata, run `work-item-router` first.
3. If the current state has no matching transition, route to `escalate`.
4. Preserve the canonical work-item format when metadata is involved.

## Fallback policy

- No valid transition → `escalate` with an explicit report.
- Ambiguous scope → `grill-with-docs` or `grill-me` before choosing a builder skill.
- Missing governance preflight → `work-item-router` first.
