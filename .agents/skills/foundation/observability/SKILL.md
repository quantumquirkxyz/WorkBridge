---
name: "observability"
category: "foundation"
maturity: "stable"
version: "2"
description: "Define the logs, metrics, traces, and alerts needed to understand a system in production — with SLIs, SLOs, dashboards, alert rules, and incident runbooks."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Observability design complete; artifact saved; completion criteria checked."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "foundation"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/observability.json"
diataxis: "how-to"
tags: ["foundation"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: system surface, production risk, operational context, and available telemetry.
- Output: SLI/SLO spec, dashboard design, alert rules, incident runbook, and signal ownership.
- Scope: stay within the skill's declared boundaries; do not broaden without explicit direction.
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

Emit `ObservabilityArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/observability/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Observability

Use this skill when a system needs to be understood in production, not just in tests. Design operational signals — SLIs, SLOs, dashboards, alerts, and runbooks — so the system stays understandable under load.


## Process

### 1. Identify critical user journeys
- What must always work? (login, checkout, search, data retrieval, payment).
- For each journey: what is the user-facing outcome?

**Completion criterion:** journeys listed.

### 2. Define SLIs
For each journey, pick 2–4 indicators:
- **Latency:** request latency (p50 / p95 / p99).
- **Availability:** success rate (HTTP 2xx / total) or error rate.
- **Quality:** result relevance, correctness rate, data freshness.
- **Freshness:** data delay (time from source update to available to user).

**Completion criterion:** SLIs defined per journey.

### 3. Set SLOs
Target values per SLO (e.g. 99.9% availability over 30 days; p95 latency < 200ms; error rate < 0.1%).
Compute error budget (1 — SLO target) — available for planned maintenance / risk-taking.

**Completion criterion:** SLO targets stated; error budgets computed.

### 4. Design alerts
- **Critical:** page immediately (availability < SLO, latency spike, error rate surge).
- **Warning:** investigate within 15 min (gradual degradation, resource exhaustion).
- **Info:** log for trend analysis (slow growth, seasonal patterns).
- **Routing:** to on-call, team, or manager based on severity.
- **Escalation:** if not acknowledged, auto-escalate.

**Completion criterion:** alert rules defined with thresholds, routing, escalation.

### 5. Dashboards
- **Overview:** key SLIs, current SLO status, error budget consumed.
- **Detail:** per-service, per-journey, per-region.
- **Trace:** link to tracing for debugging.
- **Historical:** trends over 30/90/365 days.

**Completion criterion:** dashboard design saved.

### 6. Incident runbook
For each critical alert: what to check first? (metrics, logs, traces, recent deploys, dependency status). What is the rollback / mitigation action? Who to page?

**Completion criterion:** runbook saved for each critical alert.

### 7. Signal ownership and safety
- Define who owns each signal, dashboard, and alert.
- Set retention, sampling, and redaction rules for sensitive data.
- Document deploy markers and release identity for regression attribution.

**Completion criterion:** ownership and safety constraints are explicit.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml