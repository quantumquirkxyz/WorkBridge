---
name: "quant-risk-modeling"
category: "skill-dev/sandbox"
maturity: "stable"
version: "1"
description: "Model market/portfolio/credit risk (VaR, CVaR, drawdown, stress) with explicit distributions, assumptions, and validation against historical stress events."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Model market/portfolio/credit risk (VaR, CVaR, drawdown, stress) with explicit distributions, assumptions, and validation against historical stress events complete; required sections present; completion criteria checked."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "model"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/quant-risk-modeling.json"
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

Emit `QuantRiskModelingArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/quant-risk-modeling/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Quant Risk Modeling

Build a **risk measure** — VaR, CVaR, drawdown, stress — with explicit distributions, assumptions, and historical validation. A risk number without context is misleading.

## When to use

- The user needs a risk metric for a portfolio or strategy.
- A backtest needs a drawdown / stress profile.
- A strategy needs a position-size or leverage cap based on risk.

## Process

### 1. Define the risk object

State exactly what needs measurement: portfolio-level P&L, a single factor, a strategy, an instrument. Time horizon (1-day / 10-day / monthly) matters.

**Completion criterion:** risk object and horizon named; measurement unit (absolute / % / $) specified.

### 2. Choose distribution / model

- **Parametric:** Normal, Student-t, GARCH, multivariate Normal / t.
- **Non-parametric:** historical simulation, bootstrap.
- **Scenario / stress:** specific shocks (rates +200bp, equity crash 2008).
- **Credit / default:** CVaR for defaults, PD/LGD/EAD framework.

Name the choice and why it fits the regime (e.g. "t-distribution for fat tails").

**Completion criterion:** model named; assumption (distribution, correlation, independence) listed.

### 3. Compute

Run with explicit parameters. Report:

- **VaR** at chosen confidence (e.g. 95%, 99%).
- **CVaR / ES** (expected shortfall) — more stable than VaR.
- **Drawdown:** max, average, recovery time.
- **Stress:** impact of named historical or hypothetical shock.

**Completion criterion:** all requested measures present with exact parameters.

### 4. Validate

- **Backtest coverage:** does VaR 95% cover ~95% of out-of-sample days? If not, recalibrate.
- **Stress test:** does the model predict known historical losses within a factor?
- **Stability:** does the risk measure jump wildly on small data changes?

**Completion criterion:** out-of-sample coverage or stability check completed; discrepancy addressed.

### 5. Deliver

Markdown artifact: risk definition, model, measures, validation, and a note on what the number means operationally (e.g. "VaR 99% = $1.2M; expected loss beyond is CVaR 99% = $2.5M").

**Completion criterion:** deliverable includes measures, validation, and an operational interpretation.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml