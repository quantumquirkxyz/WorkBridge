---
name: "quant-derivatives-pricing"
category: "skill-dev/sandbox"
maturity: "stable"
version: "1"
description: "Price and calibrate derivatives (options, exotics, structured products) — Black-Scholes, trees, Monte Carlo — with Greeks, model risk, and calibration validation."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Price and calibrate derivatives (options, exotics, structured products) complete; required sections present; completion criteria checked."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "pull-request"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/quant-derivatives-pricing.json"
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

Emit `QuantDerivativesPricingArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/quant-derivatives-pricing/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Derivatives Pricing & Calibration

Price a **derivative** — vanilla option, exotic, structured — using a model, compute Greeks, and validate calibration against market data.

## When to use

- The user wants to price an option, swap, exotic, or structured product.
- A risk desk needs Greeks for hedging.
- A quant strategy involves derivatives as a building block.

## Process

### 1. Define the instrument

Name the instrument type (European call, American put, barrier, Asian, quanto, swaption, etc.). Specify underlier, notional, maturity, strike, currency, exercise style (European / American / Bermudan), and payoff structure.

**Completion criterion:** instrument fully specified with all contractual terms.

### 2. Choose the model

- **Black-Scholes** — European options on log-normal underliers; closed-form.
- **Black-76** — futures / forward options; cap/floor.
- **Binomial / Trinomial trees** — American options, early exercise premium.
- **Monte Carlo** — path-dependent exotics, stochastic vol.
- **Heston** — stochastic vol; semi-closed form (characteristic function) or MC.
- **Local vol** — calibrated to vol surface.
- **Jump-diffusion** — Merton, Kou; for gaps and fat tails.

Name the model and state the SDE.

**Completion criterion:** model named; SDE or pricing equation written.

### 3. Price

Run the model:

- Analytical (closed-form formula).
- Numerical (tree steps, MC paths, PDE grid).
- Report the price; state the risk-neutral vs physical measure if relevant.

**Completion criterion:** price computed; method, steps / paths, and seed (if MC) reported.

### 4. Compute Greeks

Report at minimum: Δ, Γ, ν (vega), ρ (rho), θ. For American options, also report early exercise boundary. Greeks should be computed via bump-and-reprice or finite differences on the model.

**Completion criterion:** Δ, Γ, ν, ρ, θ all present; method (bump-and-reprice or finite diff) stated.

### 5. Calibrate to market

If using a model with free parameters (Heston k, θ, ν, ρ; local vol volatility):

- Fit to market-implied vol surface (minimise squared-error weighted by vega).
- Report calibration error (RMSE in vol points).
- Stress the calibration: what happens to price if one vol parameter changes?

**Completion criterion:** calibration done; RMSE reported; stressed parameters.

### 6. Deliver

Markdown artifact: instrument, model, SDE, price, Greeks, calibration (if applicable), and a **model risk note** — what the model ignores and what the gap to market means.

**Completion criterion:** deliverable complete; model risk addressed.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml