# Loop Budgets Reference

How to choose budget values, what the nudges mean, what the ledger records, and why every loop ends with a typed verdict. Companion to `../SKILL.md` and `.agents/skills/platform/loop-runner.mjs`.

## Choosing budgets by loop type

Budgets are declared UP FRONT, before the first iteration, and checked before each step executes. `costLimit` counts abstract cost units; each step charges 1 unless its verdict carries a `cost`. Throwing steps are charged too - a failed generation still consumed the attempt.

| Budget field | Repair loops | Polling loops | Fan-out loops |
|---|---|---|---|
| `stepLimit` | 5-10; a repair loop that has not converged by then is guessing | 20-50; bounded by expected polls, scaled to the poll interval | one dispatch per work item, plus a small slack |
| `costLimit` | tight - repairs should be cheap; cap runaway retries | loose per poll, hard cap overall | sum of child costs plus one dispatch margin |
| `wallTimeLimitMs` | minutes - human attention span for a stuck repair | the poll interval times the expected polls, plus a margin | the slowest expected child plus a margin |
| `repeatThreshold` | 3 - the same edit with the same failing result is not a repair | exempt via `exemptActions` or rely on changing results | 2-3 - redispatching the same item unchanged is a bug |
| `repeatWindow` / `pingPongWindow` | 12 - enough to see a cycle, small enough to notice fast | n/a when results change | 12 |
| `maxConsecutiveFormatErrors` | 3 - malformed generations stop the loop early | 3 | 3 |

Loop types:

- **Repair loops** - edit, run tests, edit again. The signature risk is the same edit producing the same failure. `repeatThreshold: 3` catches it; the A-B-A-B detector catches two competing fixes oscillating.
- **Polling loops** - check status until done. Results change every poll, so the result hash makes each step unique and no repeat detector fires. When an action repeats with an identical result by design (a fixed `sleep` or a constant-state sentinel), list it in `exemptActions`.
- **Fan-out loops** - dispatch many children and collect. Budget on total dispatched steps and cost, not per-child latency, and treat a redispatch of a finished child as a repeat.

## Nudge taxonomy

Nudges are structured messages passed to `onNudge` and collected in the verdict's `nudges`. They escalate warning -> backoff -> block; only `block` halts the loop, always as a typed exit.

| Nudge | Severity | Meaning | Expected agent response |
|---|---|---|---|
| `repeat` | `warning` | Same action+args+result seen twice | Change the approach |
| `repeat` | `backoff` | One repeat below `repeatThreshold` | Re-read state before retrying; one more identical repeat halts |
| `repeat` | `block` | `repeatThreshold` reached | Loop halts with `repeated-action`; do not restart unchanged |
| `ping-pong` | `warning` | Early A-B-A alternation detected | Make the next step depend on the last result |
| `ping-pong` | `block` | A-B-A-B oscillation confirmed | Loop halts with `ping-pong`; reconcile the competing actions |
| `format-error` | `warning` | A step threw or declared an error; streak below `maxConsecutiveFormatErrors` | Regenerate a well-formed step; only the first format-error message is kept in the retry prompt |
| `format-error` | `block` | Consecutive format errors reached `maxConsecutiveFormatErrors` | Loop halts with `format-errors`; fix the generation format |

## Ledger format

The ledger is append-only, one JSON line per step, plus a final summary line. It lives at a path compaction never touches (default `.scratch/loop-ledger.jsonl`) so an interrupted run keeps its state.

```json
{"type":"step","seq":0,"ts":"2026-10-10T12:00:00.000Z","loopId":null,"action":"edit-file","args":{"file":"src/parser.js"},"argsHash":"9f2c...","resultSignature":"41ab...","stepHash":"77d0...","status":"ok","cost":1,"wallTimeMs":12}
{"type":"step-error","seq":1,"ts":"2026-10-10T12:00:01.000Z","loopId":null,"action":"__step__","args":null,"argsHash":"5c1e...","resultSignature":"b2a9...","stepHash":"0e33...","status":"error","cost":1,"wallTimeMs":3,"error":"model emitted malformed JSON"}
{"type":"summary","ts":"2026-10-10T12:00:02.000Z","loopId":null,"exitStatus":"format-errors","steps":2,"cost":2,"wallTimeMs":40,"nudgeCount":2}
```

Rules:

- Hashes: `argsHash` = sha256 of the canonical JSON of `args`; `resultSignature` = sha256 of the canonical JSON of `result`; `stepHash` = sha256 of `action`, `argsHash`, and `resultSignature`.
- Results are referenced by signature, not pasted - the ledger records that the step happened, with what arguments, at what cost.
- Never truncate, rotate away, or summarize the step lines. A compaction may summarize the payload of a step; it may never delete the fact that the step happened.

## The typed exit rule

Loops end with a verdict object, not an exception. The runner never throws for loop-control reasons; the verdict is the only exit and the only interface the caller routes on:

```json
{
  "exitStatus": "completed",
  "submission": { "answer": "parser guard fixed; 42/42 tests pass" },
  "budgetSpent": { "steps": 5, "cost": 5, "wallTimeMs": 84 },
  "nudges": []
}
```

- `completed` - the step iterator finished; `submission` is the iterator's return value or the last verdict.
- `limits-exceeded` - a declared budget (steps, cost, or wall time) was exhausted; `budgetSpent` shows exactly what was spent.
- `repeated-action` - identical action+args+result reached `repeatThreshold`; the final nudge names the action.
- `ping-pong` - A-B-A-B oscillation reached `pingPongWindow`; the final nudge names both actions.
- `format-errors` - consecutive malformed/failed steps reached `maxConsecutiveFormatErrors`; each failed step was charged and recorded.

Route on `exitStatus`, read the last nudge for the cause, and never restart the same loop unchanged after a non-`completed` exit.
