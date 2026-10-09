---
name: "chaos-engineering"
category: "skill-dev/sandbox"
maturity: "stable"
version: "1"
description: "Design chaos engineering — fault injection, GameDays, resilience validation — with explicit steady-state hypotheses, blast radius controls, and safety rails."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Experiment plan defined; fault injection config documented; resilience report produced."
risk: "medium"
trustTier: "3"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "devops"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/chaos-engineering.json"
diataxis: "how-to"
tags: ["devops"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: service inventory, SLOs, dependency graph, production traffic patterns.
- Output: chaos experiment plan + fault injection config + resilience report.
- Scope: designs experiments and documents results; does not execute production chaos without explicit authorisation and safety review.
- Rule: designs experiments and documents results; does not execute production chaos without explicit authorisation and safety review.
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

Emit `ChaosEngineeringArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/chaos-engineering/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Chaos Engineering

Design **chaos engineering** — fault injection, GameDays, resilience validation — with explicit steady-state hypotheses, blast radius controls, and safety rails.

## Process

### 1. Define steady state
- System behaviour under normal conditions (SLOs: latency, error rate, throughput).
- Observable metrics and dashboards for live monitoring during experiments.
- Blast radius definition (region, cluster, service, customer segment).
- Safety rails (abort conditions, automatic rollback, circuit breakers).

**Completion criterion:** steady-state metrics, blast radius, and safety rails documented.

### 2. Identify weaknesses
- Dependency map (upstream services, databases, caches, DNS, load balancers).
- Historical failure modes (outages, degradation, cascading failures).
- Single points of failure and lack of redundancy.
- Hypothesis: "If we inject fault X, the system will behave Y within SLO."

**Completion criterion:** weakness list and experiment hypotheses documented.

### 3. Design experiments
- Fault types (network latency, packet loss, DNS failure, CPU / memory pressure, instance termination, dependency failure).
- Experiment scope (production-like staging vs production; time window).
- Success and failure criteria (SLO held? system degraded? data lost?).
- Rollback plan (manual and automated).

**Completion criterion:** experiment design with success/failure criteria defined.

### 4. Run GameDay
- Pre-flight checklist (approvals, monitoring ready, on-call briefed).
- Execute fault injection with real-time observation.
- Abort immediately if safety rails are breached.
- Record timeline, observations, and system response.

**Completion criterion:** GameDay execution log and observation notes saved.

### 5. Analyze and document
- Compare observed behaviour against steady-state hypothesis.
- Identify surprising behaviours, hidden dependencies, and resilience gaps.
- Assess impact on user experience and downstream services.
- Prioritise remediation (P0 fix, P1 follow-up, accepted risk).

**Completion criterion:** resilience report with findings and remediation backlog defined.

### 6. Continuous improvement
- Automate repeatable experiments in CI/CD or staging.
- Track remediation items and verify fixes with follow-up experiments.
- Expand experiment coverage to new services and failure modes.
- Share findings across teams to build organisational resilience knowledge.

**Completion criterion:** automation plan and sharing process defined.

## Rules

- Rule: start with a steady-state hypothesis; never inject faults without an expected outcome.
- Rule: limit blast radius; prefer staging over production for first experiments.
- Rule: require live monitoring and on-call readiness before any fault injection.
- Rule: stop immediately if abort conditions are met; do not push through to prove a point.
- Rule: treat every finding as a product risk item, not a one-off engineering curiosity.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml