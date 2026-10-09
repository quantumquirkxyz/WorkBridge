---
name: "quant-credit-risk"
category: "skill-dev/sandbox"
maturity: "stable"
version: "1"
description: "Model credit risk — PD, LGD, EAD, expected loss, loss distribution, credit VaR — with default correlation and portfolio-level risk aggregation."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Model credit risk complete; required sections present; completion criteria checked."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "quant"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/quant-credit-risk.json"
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

Emit `QuantCreditRiskArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/quant-credit-risk/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Credit Risk Modeling

Model **credit risk** at the instrument and portfolio level — PD, LGD, EAD, EL, UL — with default correlation and aggregation.

## When to use

- The user wants to model credit exposure, expected loss, or portfolio credit risk.
- A loan book, bond portfolio, or corporate credit desk needs risk quantification.
- A Basel / IFRS 9 / CECL calculation is needed.

## Process

1. Define scope — single name / portfolio; rating grade; time horizon (1Y PD, lifetime PD).
2. Estimate PD — historical default frequency,迁移矩阵, KMV-Merton model, or logistic regression on financial ratios.
3. Estimate LGD — workout LGD vs market LGD; recovery rate; downturn LGD (regulatory).
4. Estimate EAD — drawn amount + credit conversion factor (CCF) for off-balance-sheet.
5. Compute Expected Loss (EL) = PD × LGD × EAD; Unexpected Loss (UL) = √(variance of loss).
6. Default correlation — Basel rho formula (equity-based), or copula (Gaussian, t-copula). Aggregate portfolio loss distribution.
7. Stress testing — PD + 2 grades, LGD × 1.5, portfolio loss at 99.9%.
8. Deliver — artifact: PD/LGD/EAD estimates with methodology, EL/UL, correlation, stress test, and regulatory compliance note (Basel III / IFRS 9).

## Rules

- Rule: state that outputs are analytical and not lending, investment, or regulatory advice.
- Rule: define horizon, exposure type, rating system, and portfolio scope before estimating risk.
- Rule: keep PD, LGD, EAD, expected loss, and unexpected loss conceptually separate.
- Rule: document calibration data, default definition, and downturn assumptions.
- Rule: stress-test correlation, concentration, and macro scenarios.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml