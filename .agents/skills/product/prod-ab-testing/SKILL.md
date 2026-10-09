---
name: "prod-ab-testing"
category: "product"
maturity: "stable"
version: "1"
description: "Design A/B tests — hypothesis, control/treatment, randomization, metrics, statistical power, duration — with valid inference and rollback rules."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Test design saved; analysis plan saved; rollback rules defined; statistical power computed."
risk: "medium"
trustTier: "3"
maxIterations: "5"
promptVersion: "2.0"
artifactType: "pull-request"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/prod-ab-testing.json"
diataxis: "how-to"
tags: ["product"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: feature change, user segment, metric of interest.
- Output: test design with power analysis and rollback rules.
- Scope: designs experiment; does not expose users to unapproved changes.
- Rule: designs experiment; does not expose users to unapproved changes.
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

Emit `ProdAbTestingArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/prod-ab-testing/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# A/B Testing Design

Design an **A/B test** — hypothesis, randomisation, metrics, statistical power — with valid inference.

## Process

### 1. Hypothesis
State a clear, testable statement:
- "Changing the checkout button from grey to green increases conversion rate by ≥ 2%."
- Must specify: metric, direction, magnitude, user segment.

**Completion criterion:** hypothesis saved with metric, direction, magnitude.

### 2. Selection
- **Control:** current experience.
- **Treatment:** new experience.
- **Randomisation:** user-level assignment (cookie / account / session); must be independent of behaviour.
- **Segmentation:** if testing on a subset (e.g. new users only), state why.
- **Exclusions:** users with special conditions (e.g. VIP, internal, disabled users) must be handled ethically.

**Completion criterion:** assignment method saved; exclusions noted.

### 3. Metrics
- **Primary:** the metric that determines success (e.g. conversion rate, click-through rate, retention).
- **Secondary:** supportive metrics (e.g. revenue per user, time on task, error rate).
- **Guardrail:** metrics that must not degrade (e.g. page load time, accessibility, error rate, support tickets).

**Completion criterion:** metrics defined with direction (increase / decrease / maintain).

### 4. Duration and sample size
Compute:
- **Minimum detectable effect (MDE):** smallest improvement that is practically meaningful.
- **Power:** 1 — β (typically 0.8 or 0.9).
- **Significance level α:** 0.05 (or 0.01 for critical decisions).
- **Sample size per variant:** derived from baseline rate, MDE, α, power.
- **Duration:** sample size / daily traffic per variant; account for weekly seasonality; run at least one full week.

**Completion criterion:** sample size and duration computed.

### 5. Analysis plan
- **Statistical test:** z-test for proportions; t-test for means; Mann-Whitney for non-normal; bootstrap for complex metrics.
- **Segmentation:** analyse by subgroups (device, region, user type) — but do not over-segment (risk of false positives).
- **Interaction:** check if treatment effect varies by subgroup (interaction test).
- **Multiple testing correction:** Bonferroni or FDR if testing many metrics or segments.

**Completion criterion:** analysis plan saved.

### 6. Rollback / escalation rules
- **Early stopping rules:** if guardrail metric degrades beyond threshold during first N% of planned duration, stop.
- **Success criteria:** primary metric improves by ≥ MDE with p < α; guardrail metrics not degraded.
- **Rollback:** revert treatment for all users if success criteria not met by end of planned duration, or if guardrail fails.

**Completion criterion:** rollback and escalation rules saved.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml