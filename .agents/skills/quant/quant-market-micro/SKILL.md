---
name: "quant-market-micro"
category: "skill-dev/sandbox"
maturity: "stable"
version: "1"
description: "Analyse market microstructure — order book dynamics, price formation, execution costs (slippage, spread, impact), and optimal execution strategies."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Analyse market microstructure complete; required sections present; completion criteria checked."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "quant"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/quant-market-micro.json"
diataxis: "how-to"
tags: ["quant"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: skill invocation with the user's request and available context.
- Output: a structured artifact or guidance aligned to the skill's declared outputs.
- Scope: stay within the skill's declared boundaries; do not broaden without explicit direction.
- Rule: follow the skill's completion criteria and stop condition exactly.

## Provenance

| Question | Answer |
|---|---|
| What is the source of truth? | The user's request, originating spec/issue, and the skill's declared outputs |
| What is in scope? | Work covered by the skill's acceptance criteria and completion rules |
| What is explicitly out of scope? | Files, behaviors, and decisions outside the skill's declared boundary |
| Who or what consumes this artifact afterward? | The next skill in the workflow or the user |
| What evidence proves it is done? | Completion criteria met, artifact saved, validation passed |
| What risk remains? | Subjective judgment calls, missing context, or external dependency failures


## Artifact

Emit `QuantMarketMicroArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/quant-market-micro/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Market Microstructure

Analyse **market microstructure** — order book, price formation, execution costs, and optimal execution — with quantitative models.

## When to use

- The user wants to analyse or minimise execution costs.
- An algo trading or execution strategy needs a market model.
- A quant strategy needs realistic slippage / spread estimates.

## Process

1. Identify venue type — lit exchange, dark pool, OTC, CEX vs DEX.
2. Order book model — queueing theory (Geometric Brownian Motion of queue), Glosten-Milgrom (adverse selection), or Kyle's lambda.
3. Spread decomposition — bid-ask spread = adverse selection + inventory + order processing cost.
4. Execution costs — slippage vs arrival price, market impact (temporary vs permanent), timing risk from delay.
5. Optimal execution — Almgren-Chriss framework (minimise expected cost + variance of execution); VWAP, TWAP, POV benchmarks.
6. Data requirements — tick data, order log, trade reporting; NO OHLCV-only backtests for microstructure claims.
7. Deliver — artifact: venue model, spread decomposition, cost estimate (bps), and optimal execution schedule.

## Rules

- Rule: do not infer microstructure behavior from OHLCV-only data.
- Rule: identify venue rules, tick size, fees, queue priority, and latency assumptions.
- Rule: separate spread, slippage, market impact, and timing risk.
- Rule: model temporary and permanent impact separately when estimating execution cost.
- Rule: validate execution assumptions against tick, quote, or order-book data.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml