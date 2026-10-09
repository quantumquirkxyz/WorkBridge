---
name: "math-probability-models"
category: "skill-dev/sandbox"
maturity: "stable"
version: "1"
description: "Build probability models — distributions, stochastic processes (Markov, Brownian, Poisson), inference — with explicit assumptions and sanity checks."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Build probability models complete; required sections present; completion criteria checked."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "pull-request"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/math-probability-models.json"
diataxis: "how-to"
tags: ["math"]
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

Emit `MathProbabilityModelsArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/math-probability-models/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Probability & Stochastic Modeling

Construct a **probability model** — distribution, process, or inference — with explicit assumptions and checks against known limits.

## When to use

- User asks for random variables, distributions, stochastic processes, or inference.
- A risk / quant / ML problem needs a probabilistic backbone.

## Process

### 1. Define the space

Name the sample space and events; identify if a sigma-algebra is needed (continuous spaces).

**Completion criterion:** sample space and event space explicit; independence / measurability called out if relevant.

### 2. Choose distribution / process

- Discrete (Bernoulli, Binomial, Poisson, Geometric).
- Continuous (Uniform, Normal, Exponential, Beta, Gamma, t, chi-square).
- Multivariate (Multivariate Normal, Dirichlet, Copulas).
- Stochastic processes (Markov chain, Poisson process, Brownian motion, Lévy, ARMA / GARCH).
- Bayesian: prior + likelihood → posterior.

**Completion criterion:** distribution or process named with type and parameters.

### 3. State parameters

Each parameter is named with value or estimation method (MLE, MAP, moment-matching, prior).

**Completion criterion:** parameters listed with values or estimation procedure.

### 4. Compute / simulate

- Analytical where tractable (mean, variance, CDF, moments).
- Monte Carlo with: seed, sample size N (justified), convergence check.
- For inference: posterior sampling (MCMC, variational, conjugate update).

**Completion criterion:** computation done; sample size or analytical result explicit.

### 5. Validate

- **Limits:** law of large numbers, central limit, stationary distribution, long-run mean.
- **Sanity:** small cases (n=1, 2, 3) checked by hand.
- **Cross-check:** analytical vs simulated mean / variance / tail probability.
- **Calibration:** does the model reproduce known data moments?

**Completion criterion:** validation completed; discrepancy addressed.

### 6. Deliver

Markdown artifact: model, parameters, computation, validation, and an operational interpretation ("expected return X% with std Y% over horizon T").

**Completion criterion:** artifact complete and reproducible.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml