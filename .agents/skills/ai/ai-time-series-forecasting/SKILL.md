---
name: "ai-time-series-forecasting"
category: "skill-dev/sandbox"
maturity: "stable"
version: "1"
description: "Design and evaluate time-series forecasting — ARIMA, Prophet, NeuralProphet, LSTM, Transformer — with stationarity analysis, seasonality, exogenous variables, and backtest."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Forecast plot saved; backtest complete; best model recommendation made."
risk: "medium"
trustTier: "3"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "ai"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/ai-time-series-forecasting.json"
diataxis: "how-to"
tags: ["ai"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: time-series data (date + target; optional exogenous variables).
- Output: forecast plot + comparison + recommendation.
- Scope: designs forecasting pipeline; does not make business decisions.
- Rule: designs forecasting pipeline; does not make business decisions.
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

Emit `AiTimeSeriesForecastingArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/ai-time-series-forecasting/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Time-Series Forecasting

Build a **time-series forecast** — with stationarity analysis, seasonality, exogenous variables, and backtest — and recommend the best model.

## Process

### 1. Data inspection
Plot series; check for missing values, outliers, structural breaks. Check stationarity: ADF test, KPSS test. Decompose: trend + seasonal + residual.

**Completion criterion:** stationarity state stated; seasonality identified.

### 2. Feature engineering
Lag features (autoregressive terms); rolling statistics; exogenous variables (available at forecast time); categorical time features.

**Completion criterion:** feature set documented; no leakage.

### 3. Model selection
Classical (ARIMA / SARIMA / Prophet), gradient-boosted (XGBoost / LightGBM), deep learning (LSTM / Transformer / N-BEATS), or ensemble. Select by backtest performance, not training error.

**Completion criterion:** model family selected with justification.

### 4. Backtest
Rolling / expanding window; respect time order; evaluate MAPE, sMAPE, MASE, RMSE, MAE.

**Completion criterion:** backtest complete; metrics on holdout.

### 5. Prediction intervals
Provide 80% / 95% intervals — not just point forecasts.

**Completion criterion:** intervals in plot.

### 6. Recommendation
Best model with evidence; limitations (exogenous availability, structural breaks, seasonality change); re-training frequency.

**Completion criterion:** recommendation with conditions.

## Rules

- Rule: preserve time order in every split, feature, and validation step.
- Rule: include naive, seasonal naive, or simple baseline models before complex models.
- Rule: use only exogenous variables known at forecast time.
- Rule: evaluate with rolling or expanding backtests, not random splits.
- Rule: report uncertainty intervals and structural-break limitations with the forecast.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml