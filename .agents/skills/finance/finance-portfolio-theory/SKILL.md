---
name: "finance-portfolio-theory"
category: "skill-dev/sandbox"
maturity: "stable"
version: "1"
description: "Modern Portfolio Theory — efficient frontier, CAPM, APT, risk attribution, and performance measurement — with explicit assumptions and regime analysis."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Modern Portfolio Theory complete; required sections present; completion criteria checked."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "finance"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/finance-portfolio-theory.json"
diataxis: "how-to"
tags: ["finance"]
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

Emit `FinancePortfolioTheoryArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/finance-portfolio-theory/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Portfolio Theory

Apply **Modern Portfolio Theory** — efficient frontier, CAPM, APT, performance attribution — with explicit assumptions and regime analysis.

## When to use

- The user wants to understand portfolio construction theory.
- CAPM / factor models are used for expected returns or risk attribution.
- Performance attribution or benchmark comparison is needed.

## Process

1. Define universe — assets, time window, currency.
2. Compute moments — expected returns (historical, factor, or blended), covariance matrix (shrinkage justified), correlations.
3. Efficient frontier — compute frontier; identify minimum-variance portfolio, tangency portfolio, and efficient set.
4. CAPM / APT — estimate beta for each asset; APT: factor exposures (Fama-French 3/5, momentum, quality).
5. Performance attribution — Brinson-Hood-Beebower: allocation, selection, interaction effects.
6. Regime analysis — does the factor model / efficient frontier hold across economic regimes?
7. Deliver — artifact: efficient frontier, CAPM betas / APT factor exposures, attribution decomposition, and a note on model assumptions and regime robustness.

## Rules

- Rule: state that outputs are analytical and not personalized financial advice.
- Rule: define universe, benchmark, horizon, currency, and rebalancing assumptions before optimizing.
- Rule: treat expected return estimates as fragile and show sensitivity to assumptions.
- Rule: check covariance stability, concentration, turnover, and transaction-cost impact.
- Rule: distinguish ex ante risk modeling from realized performance attribution.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml