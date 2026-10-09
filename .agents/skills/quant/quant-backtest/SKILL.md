---
name: "quant-backtest"
category: "skill-dev/sandbox"
maturity: "stable"
version: "1"
description: "Run a backtest with full audit hygiene — biases, costs, out-of-sample, regime splits — and produce a verdict on whether a strategy is robust."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Audit report complete with strategy spec, data audit, statistics, stress tests, and verdict."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "test-strategy"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/quant-backtest.json"
diataxis: "how-to"
tags: ["quant"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: trading strategy definition (signal, universe, sizing, costs).
- Output: backtest audit report with strategy spec, data audit, statistics, stress tests, and verdict.
- Scope: produces audit report; does not execute live trading.
- Rule: produces audit report; does not execute live trading.
- Rule: documented standards override defaults; explicit project rules take precedence.
- Rule: if blocked by missing context or dependencies, surface the blocker before proceeding.

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

Emit `QuantBacktestArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/quant-backtest/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Quant Backtest Audit

Take a **strategy** and produce a **backtest result you can defend**. A backtest that can't survive audit is decoration.

## When to use

- The user has a strategy and wants its historical performance.
- A claimed alpha or Sharpe needs independent verification.
- A live-trading decision will be made from the result.

## Process

### 1. Spec the strategy

Capture in writing:

- **Signal(s)** — input → score → decision.
- **Universe** — assets and any filtering rules.
- **Schedule** — rebalance dates, holding period.
- **Sizing** — equal weight, vol-targeted, Kelly-fraction.
- **Costs** — commissions, spread, borrow, impact.

No ambiguity. If a parameter is unspecified, ask.

**Completion criterion:** the strategy could be re-implemented from the spec alone.

### 2. Audit the data

- **Survivorship bias:** use point-in-time dataset; keep delisted names.
- **Look-ahead:** features computed only on data available at the decision timestamp.
- **Adjustments:** splits, dividends, mergers consistent with provider.
- **Corporate actions:** delistings reflected in returns (delisting return ≠ 0).

**Completion criterion:** each bias named and the dataset policy is documented.

### 3. Run the backtest

- **Transaction-cost model:** not zero. Commissions + spread + impact estimate.
- **Out-of-sample split:** train / test / walk-forward, not just one backtest window.
- **Benchmark:** explicit (e.g. cap-weighted universe, risk-free, SPY).
- Report: Sharpe, Sortino, max drawdown, Calmar, annualised return, annualised vol, win rate.

**Completion criterion:** backtest run; out-of-sample period honoured; all statistics present.

### 4. Stress tests

- **Subperiods:** does it survive across decades / regimes (2008, 2020, 2022)?
- **Sectors / geographies:** is the effect localised to one slice?
- **Turnover:** annualised; high turnover often eats alpha.
- **Crowding:** is the strategy correlated with known crowded trades?

**Completion criterion:** each stress test reported; weakest point named.

### 5. Coverage validation

Does VaR 95% cover ~95% of out-of-sample days? If not, recalibrate.

**Completion criterion:** coverage check completed; discrepancy addressed.

### 6. Verdict

Deliver the verdict:

- **Robust:** survives stress tests, stable across subperiods, reasonable turnover, Sharpe > 1 after costs.
- **Weak:** passes some tests but fragile under regime change or high turnover.
- **Fails:** does not survive out-of-sample or stress tests.

**Completion criterion:** verdict stated with evidence; recommendation (deploy / do not deploy / revise).

### 7. Deliver

Markdown artifact: strategy spec, data audit, backtest statistics, stress tests, coverage validation, and verdict with explicit conditions.

**Completion criterion:** report complete; all sections present; verdict honest.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml