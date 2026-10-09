# Vertical Slice Rules Reference

These rules govern how `to-tickets` decomposes work into tracer-bullet tickets.

## Tracer Bullet Principles

A **tracer bullet** is a vertical slice that cuts a narrow but complete path through every layer:

1. **Completeness** — Each slice delivers end-to-end behavior from schema through UI (or data plane through execution plane). A completed slice is demoable or verifiable on its own.
2. **Independence** — Each slice has an explicit blocker set or none. The frontier can be taken without guessing about order.
3. **Sizing** — Each slice fits in a single fresh context window. If a slice needs more, split it.
4. **Demoability** — A completed slice must be independently verifiable — not "mostly done" or "needs the next ticket to show value."

## Vertical vs Horizontal

| Horizontal Dump | Vertical Slice |
|---|---|
| "Write all models first" | "Add schema + API + UI for one entity" |
| Tests batch-written before implementation | One test → one implementation → repeat |
| No value until the last task completes | Each slice delivers verifiable value |
| Frontier is ambiguous | Frontier is explicit: blockers first |
| Scope creep via accumulation | Scope bounded by slice boundary |

## Wide Refactor Exception

A **wide refactor** is one mechanical change whose blast radius fans across the whole codebase. Forced vertical slicing breaks CI because a single edit breaks thousands of call sites.

Wide refactors use **expand–contract**:

1. **Expand** — Add the new form beside the old. Nothing breaks.
2. **Migrate** — Move call sites in batches sized by blast radius. Each batch is a ticket blocked by expand. CI stays green because the old form still exists.
3. **Contract** — Delete the old form once no caller remains. Ticket blocked by every migrate batch.

When batches cannot stay green alone, share an integration branch that all block a final integrate-and-verify ticket.
