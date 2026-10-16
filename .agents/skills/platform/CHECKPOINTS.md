# Checkpoints: journal, replay, and fork

Time travel for the workflow state machine. Model adapted from LangGraph
checkpointers (`docs.langchain.com/oss/python/langgraph/checkpointers` +
`use-time-travel`); the framework is not used.

## The model

Two artifacts per thread, both plain JSON:

- **`checkpoints/<workflow>.jsonl`** — an append-only event journal. One JSON
  line per state-changing command (`transition`, `rejected-by-guard`, `reset`,
  `escalate`): `{seq, ts, workflow, event, from, to, contextDelta?, guard?,
  guardResult?, legalEvents?, status, loopIterations}`. `contextDelta` is a
  sparse top-level patch (`null` removes a key), not a full context copy.
- **`state/<workflow>.json`** — the authoritative CURRENT snapshot, shape
  unchanged. It is *derived*: folding the journal reproduces it exactly.

A step rejected by a guard still journals its record (`guardResult: false`) but
changes nothing, so a failed step never invalidates the successful siblings
already folded into the snapshot (pending-writes semantics).

## Commands

```
node .agents/skills/platform/workflow-state-machine.mjs <workflow> replay [--from <seq>] [--to <seq>] [--json]
node .agents/skills/platform/workflow-state-machine.mjs <workflow> fork --to <seq> [--set key=value ...] [--name <forkName>] [--json]
```

```bash
# Re-fold the journal; `verification.matchesPersistedSnapshot` is the proof.
node .agents/skills/platform/workflow-state-machine.mjs standard-feature replay --json

# Step back to the checkpoint where the review ran.
node .agents/skills/platform/workflow-state-machine.mjs standard-feature replay --to 7 --json
```

`replay` always emits one JSON object (the folded state is the payload); it
exits `0` normally, `1` on usage errors, `3` on divergence. `fork` writes a NEW
thread at `state/<forkName>.json` with its own journal whose first record is
`forkedFrom: {workflow, seq, name}`; the original thread is never modified.
`--set` overrides accept dotted paths (`review.specFindings=0`) and the reserved
key `currentState`. Default fork names are `<workflow>-fork-<n>`.

## Using fork for the review-repair loop

When a review-fix iteration is disputed, do not roll the thread back — branch
from before it and A/B two repair strategies:

```bash
W=standard-feature
SEQ=$(node .agents/skills/platform/workflow-state-machine.mjs $W history --json | python3 -c 'import sys,json;print(len(json.load(sys.stdin)))')
node .agents/skills/platform/workflow-state-machine.mjs $W fork --to $SEQ --name fix-conservative
node .agents/skills/platform/workflow-state-machine.mjs $W fork --to $SEQ --set review.maxRounds=12 --name fix-aggressive
# Run each fork to review-pr, then compare; the original thread stays intact.
```

Both forks replay to their own snapshots, so each strategy is auditable
independently and the disputed iteration is never rewritten in place.

## Legacy runs

A snapshot written before the journal existed has no journal beside it. `replay`
then prints a structured `no-journal` result with a note and **exits 0** — a
documented capability gap, not a failure. The snapshot stays authoritative;
time travel becomes available once the next state-changing command appends a
record.

## Replay-stability guarantee

Guards are pure functions of `(state, context)`: no clock, randomness, or I/O
enters the decision. `replay` re-evaluates every recorded guard against the
context in effect when the decision was made and compares it with the recorded
`guardResult`; a disagreement is reported as `divergence` (exit `3`), which
means the workflow definition or the recorded decision changed under the
journal. Folding the whole journal reproduces the snapshot exactly, so a
guard's verdict can be re-derived rather than trusted.
