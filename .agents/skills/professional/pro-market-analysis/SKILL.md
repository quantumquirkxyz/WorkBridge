---
name: "pro-market-analysis"
category: "skill-dev/sandbox"
maturity: "stable"
version: "1"
description: "Conduct professional market research — TAM/SAM/SOM, competitor analysis, pricing, and trend forecasting — with source citation, data quality checks, and decision framing."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Conduct professional market research complete; required sections present; completion criteria checked."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "pull-request"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/pro-market-analysis.json"
diataxis: "how-to"
tags: ["professional"]
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

Emit `ProMarketAnalysisArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/pro-market-analysis/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Professional Market Research

Conduct **market analysis** — TAM/SAM/SOM, competitor mapping, pricing analysis, trend forecasting — with explicit sources and data quality checks.

## When to use
- The user needs market sizing for a business plan.
- A competitive landscape needs mapping.
- A pricing or go-to-market strategy needs data.

## Process
1. Scope — market definition, geography, time horizon.
2. TAM / SAM / SOM — total, serviceable, obtainable; justify with data sources.
3. Competitors — direct / indirect / substitutes; mapping with positioning and pricing.
4. Pricing — price points, cost structure, willingness-to-pay signals.
5. Trends — technology, regulation, demographic, macroeconomic; sources (reports, news, data APIs).
6. Data quality — primary vs secondary; date; bias; missing data acknowledged.
7. Deliver — Markdown report with sections, source citations, and a recommendation (enter / niche / avoid / watch).

## Rules

- Rule: define market boundaries before estimating size.
- Rule: cite data sources and dates for every quantitative estimate.
- Rule: separate TAM, SAM, and SOM assumptions.
- Rule: include direct competitors, substitutes, and non-consumption alternatives.
- Rule: state confidence level and missing data instead of overfitting a precise number.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml