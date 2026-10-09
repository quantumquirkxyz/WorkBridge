---
name: "finance-dcf"
category: "skill-dev/sandbox"
maturity: "stable"
version: "1"
description: "Discounted Cash Flow — forecast, WACC, terminal value, sensitivity — with explicit assumptions, cross-check against multiples, and a valuation range."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Discounted Cash Flow complete; required sections present; completion criteria checked."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "finance"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/finance-dcf.json"
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

Emit `FinanceDcfArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/finance-dcf/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Discounted Cash Flow

Run a **DCF** — forecast FCF, choose WACC, compute terminal value — and deliver a valuation range with cross-checks and sensitivity.

## When to use

- The user wants a DCF valuation for a company, project, or asset.
- A corporate valuation needs a foundational DCF alongside multiples.
- A project finance decision depends on a DCF output.

## Process

### 1. Build the forecast

Produce explicit annual projections (typically 5–10 years):

- **Revenue growth** — justified by historicals, market size, pricing power.
- **EBITDA margin** — projected path with operating leverage reasoning.
- **Capex and D&A** — investment cycle and depreciation schedule.
- **Working capital** — as % of revenue with historical justification.
- **Tax rate** — effective vs statutory; deferred tax if relevant.
- **FCF** = EBIT(1−T) + D&A − Capex − ΔWC.

**Completion criterion:** FCF projection for each year; every line justified.

### 2. Choose WACC

Compute WACC:

- **Cost of equity:** CAPM with beta (levered, from comparables or fundamental), risk-free (sovereign yield), ERP.
- **Cost of debt:** pre-tax yield on debt, or risk-free + credit spread.
- **Capital structure:** market-value weights (not book); target vs current.
- **Tax shield:** WACC = Ke·E/V + Kd·D/V·(1−T).

State the source for beta, ERP, and risk-free rate.

**Completion criterion:** WACC computed; each component sourced.

### 3. Terminal value

- **Gordon growth:** TV = FCF_n(1+g)/(WACC−g); g tied to long-run nominal GDP / inflation.
- **Exit multiple:** TV = EBITDA_n × multiple; state the multiple and its justification.
- Report both; explain which you prefer and why.

**Completion criterion:** both TV methods computed; preferred method stated with justification.

### 4. Sensitivity and scenario analysis

Build a sensitivity table: WACC (rows) × terminal growth (cols). Also run:

- **Base / Bear / Bull** scenarios with explicit assumption differences.
- **Break-even:** what growth rate or margin makes NPV = 0?

**Completion criterion:** sensitivity table present; scenarios and break-even computed.

### 5. Cross-check

- Compare DCF to market price / EV: is there a premium or discount?
- Compare to **multiples** (EV/EBITDA, P/E) on the same forecast.
- Is the DCF sensitive to terminal value? If TV > 80% of EV, flag it.

**Completion criterion:** cross-check done; TV dominance flagged if >80%.

### 6. Deliver

Markdown artifact: forecast, WACC, terminal value, sensitivity, scenarios, cross-check, and **valuation range** with a note on reliability.

**Completion criterion:** range delivered; reliability and TV dominance flagged.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml