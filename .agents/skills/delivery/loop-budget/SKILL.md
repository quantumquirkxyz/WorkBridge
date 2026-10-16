---
name: "loop-budget"
category: "delivery"
maturity: "experimental"
description: "Keep an agent loop inside its declared budget and end it with a typed verdict instead of a runaway process. Use when a repair, polling, or fan-out loop must declare step/cost/wall-time budgets up front, detect degenerate repetition and ping-pong, and exit with {exitStatus, submission, budgetSpent, nudges}."
license: "MIT"
version: "1"
capabilities:
  - declare loop budgets up front
  - detect degenerate loops (repeats, ping-pong, format errors)
  - record an append-only loop ledger and route on the typed verdict
inputs:
  - loop step verdicts ({action, args, result}) produced by the agent
  - budget fields (stepLimit, costLimit, wallTimeLimitMs, maxConsecutiveFormatErrors, repeatThreshold, repeatWindow, pingPongWindow)
  - ledger path and optional nudge callback
outputs:
  - type: object
    name: LoopBudgetVerdict
    properties:
      exitStatus:
        type: string
        enum: [completed, limits-exceeded, repeated-action, ping-pong, format-errors]
      submission:
        type: object
      budgetSpent:
        type: object
        properties:
          steps: { type: integer }
          cost: { type: number }
          wallTimeMs: { type: integer }
      nudges:
        type: array
        items:
          type: object
          properties:
            type: { type: string, enum: [repeat, ping-pong, format-error] }
            severity: { type: string, enum: [warning, backoff, block] }
            message: { type: string }
            instruction: { type: string }
    required: [exitStatus, budgetSpent, nudges]
sideEffects:
  - write-temp-file
dependencies: []
stopCondition: "Budget declared, loop executed, and the run ended with a typed LoopBudgetVerdict plus an append-only ledger; the caller routes on exitStatus."
risk: "low"
trustTier: "2"
maxIterations: 5
promptVersion: "2.0"
artifactType: "loop-budget"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ""
diataxis: "how-to"
tags: ["delivery", "loop", "budget", "agent-engineering"]
compatibility: ["delivery/implement", "delivery/review-fix-loop"]
approvalRequired: "false"
approvalFor: []
---

# Loop Budget

## Why

Agents do not stop when they should. A repair loop retries the same failing edit forever; a polling loop mistakes activity for progress; a fan-out loop redispatches work that already finished. mini-swe-agent's answer is budgets declared up front - step_limit, cost_limit, wall_time_limit_seconds, max_consecutive_format_errors - with typed exits instead of exceptions, cost charged even on parse failure, and a trajectory saved every step. SWE-agent's ACI adds the guardrails: discard invalid edits and retry, keep only the first format-error message in the retry prompt, and narrate empty results instead of dropping them. This skill applies both to any loop an agent runs, so the loop ends with a verdict the caller can route on rather than a timeout or a hung process.

The loop ledger is the durable record underneath the verdict: append-only, written every step, and never compacted. A summary may compress the payload; it may never compress the fact that the step happened.

## Contract

- Input: the loop's step verdicts ({action, args, result}), the budget declared for the loop, and a ledger path.
- Output: a `LoopBudgetVerdict` typed object - {exitStatus, submission, budgetSpent, nudges} - plus the append-only ledger file.
- Scope: loop engineering only. This skill declares budgets, detects degeneration, and records steps; it does not decide what the steps do.
- Rule: budgets are declared UP FRONT, before the first iteration, and are never relaxed mid-loop.
- Rule: the loop verdict is the only exit - every termination path returns the typed object; loop-control failures never raise exceptions.
- Rule: polling actions with changing results are exempt from repeat detection, because the result hash is part of the step signature.

## Provenance

| Question | Answer |
|---|---|
| What is the source of truth? | The budget declared before the loop started and the step verdicts it bounds |
| What is in scope? | Budget enforcement, degenerate-loop detection, ledger recording, and nudge escalation for one loop |
| What is explicitly out of scope? | The semantics of each step, artifact repair, and schema validation of the artifacts themselves |
| Who or what consumes this artifact afterward? | The calling loop (e.g. `implement`, `review-fix-loop`), routing on `exitStatus` |
| What evidence proves it is done? | A typed verdict with `budgetSpent`, a ledger with one hashed line per step, and a nudge for every escalation |
| What risk remains? | Budgets too loose to catch degeneration, or result signatures that hide a meaningful change |

## Artifact

Emit `LoopBudgetVerdict` as both:
- JSON: `.agents/skills/platform/artifacts/loop-budget/{id}.json`
- Markdown view: same filename with `.md` extension

The companion evidence is the loop ledger (default `.scratch/loop-ledger.jsonl`): one JSON line per step with `argsHash`, `resultSignature`, and `stepHash`, plus a final summary line. Implement the loop with `.agents/skills/platform/loop-runner.mjs` (`runLoop`); the budget table, nudge taxonomy, and ledger format live in `references/budgets.md`.

## Rules

- Rule: budgets are declared UP FRONT before the first iteration - stepLimit, costLimit, wallTimeLimitMs, maxConsecutiveFormatErrors, repeatThreshold, repeatWindow, pingPongWindow.
- Rule: budgets are checked before each step executes, never after - a loop at its step limit stops before spending another step.
- Rule: cost is charged even when a step throws; the failed step is written to the ledger with its error.
- Rule: the loop verdict is the only exit: {exitStatus, submission, budgetSpent, nudges}. Loop-control failures never throw.
- Rule: the ledger is append-only and never compacted - summarize the payload, never the fact that the step happened.
- Rule: a step repeating with identical args AND identical result is degeneration; the same action with a changed result is progress.

## Workflow

1. **Declare the budget.** Before the first iteration, fix stepLimit, costLimit, wallTimeLimitMs, and the degenerate-loop thresholds (maxConsecutiveFormatErrors, repeatThreshold, repeatWindow, pingPongWindow). Pick values from the table in `references/budgets.md`.
2. **Wire the ledger.** Point `ledgerPath` at `.scratch/loop-ledger.jsonl` or a session-scoped path. The runner appends one hashed JSON line per step in a finally block, so an interrupted run keeps its state.
3. **Run the loop through `runLoop`.** Pass `steps` as an async iterator of {action, args, result} verdicts and `onNudge` to receive structured escalations. The runner charges cost, detects exact repeats and A-B-A-B ping-pong, and enforces the budget before each step.
4. **Route on the verdict.** `completed` hands `submission` to the caller. `limits-exceeded`, `repeated-action`, `ping-pong`, and `format-errors` each mean the loop stopped for a declared reason - read the final nudge before deciding anything.
5. **Record the artifact.** Save the verdict as `LoopBudgetVerdict` at `.agents/skills/platform/artifacts/loop-budget/{id}.json` and keep the ledger beside it as the execution evidence.

## Guardrails

- Rule: never relax a declared budget mid-loop to keep a loop alive; declare a new budget for a new loop.
- Rule: never restart the same loop unchanged after `repeated-action`, `ping-pong`, or `format-errors` - change the approach or report the blocker.
- Rule: never write to the ledger except by appending a step or summary line; compaction loses the fact that the step happened.
- Rule: never pass an artifact downstream that failed schema validation - reject it with {artifactType, schemaErrors[], attempt} and retry with only the first format-error message.

## Completion criteria

- the budget was declared before the first iteration and enforced without mid-loop changes
- the loop ended with a typed verdict - no exception, no timeout
- the ledger holds one hashed line per step plus the summary, append-only
- every nudge emitted during the loop is recorded in the verdict's `nudges` and read before the next loop
- the artifact is saved at `.agents/skills/platform/artifacts/loop-budget/{id}.json` and the caller is identified

---
@include .agents/skills/platform/contract-base.xml
