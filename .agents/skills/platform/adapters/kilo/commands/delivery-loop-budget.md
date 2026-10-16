---
description: "Keep an agent loop inside its declared budget and end it with a typed verdict instead of a runaway process. Use when a repair, polling, or fan-out loop must declare step/cost/wall-time budgets up front, detect degenerate repetition and ping-pong, and exit with {exitStatus, submission, budgetSpent, nudges}."
---
# loop-budget

When to use: Keep an agent loop inside its declared budget and end it with a typed verdict instead of a runaway process. Use when a repair, polling, or fan-out loop must declare step/cost/wall-time budgets up front, detect degenerate repetition and ping-pong, and exit with {exitStatus, submission, budgetSpent, nudges}.

## Workflow

1. **Declare the budget.** Before the first iteration, fix stepLimit, costLimit, wallTimeLimitMs, and the degenerate-loop thresholds (maxConsecutiveFormatErrors, repeatThreshold, repeatWindow, pingPongWindow). Pick values from the table in...
2. **Wire the ledger.** Point `ledgerPath` at `.scratch/loop-ledger.jsonl` or a session-scoped path. The runner appends one hashed JSON line per step in a finally block, so an interrupted run keeps its state
3. **Run the loop through `runLoop`.** Pass `steps` as an async iterator of {action, args, result} verdicts and `onNudge` to receive structured escalations. The runner charges cost, detects exact repeats and A-B-A-B ping-pong, and enforces...
4. **Route on the verdict.** `completed` hands `submission` to the caller. `limits-exceeded`, `repeated-action`, `ping-pong`, and `format-errors` each mean the loop stopped for a declared reason - read the final nudge before deciding anything
5. **Record the artifact.** Save the verdict as `LoopBudgetVerdict` at `.agents/skills/platform/artifacts/loop-budget/{id}.json` and keep the ledger beside it as the execution evidence

## Deliverables

- loop-budget artifact

## Guardrails

- risk: low; trust tier: 2; approval required: no
- side effects: write-temp-file
- isolation: none; model tier: reasoning

Stop when: Budget declared, loop executed, and the run ended with a typed LoopBudgetVerdict plus an append-only ledger; the caller routes on exitStatus.
