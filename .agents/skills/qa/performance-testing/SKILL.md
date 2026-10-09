---
name: "performance-testing"
category: "qa"
maturity: "stable"
version: "1"
description: "Design and execute performance tests — load, stress, soak, spike — to validate latency, throughput, and resource consumption under realistic conditions."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Design and execute performance tests complete; artifact saved; completion criteria checked."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "test-strategy"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/performance-testing.json"
diataxis: "how-to"
tags: ["qa"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: skill invocation with the user's request and available context.
- Output: a structured artifact or guidance aligned to the skill's declared outputs.
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

Emit `PerformanceTestingArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/performance-testing/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# performance-testing

Design and execute performance tests — load, stress, soak, spike — to validate latency, throughput, and resource consumption under realistic conditions.

## Goals
- Validate performance SLIs (latency, throughput, error rate)
- Identify bottlenecks before users encounter them
- Set performance baselines and regression thresholds
- Report actionable findings with evidence


## Test Types

| Type | Goal | Duration |
|---|---|---|
| Load test | Validate SLA at expected load | 15–60 min |
| Stress test | Find breaking point | Until failure |
| Soak test | Detect memory leaks | 2–8 hours |
| Spike test | Measure recovery | Minutes |
| Smoke test | Quick sanity check | 2–5 min |

## Metrics

- **Latency**: p50, p95, p99 response time
- **Throughput**: requests/second
- **Error rate**: % of failed requests
- **Resource**: CPU, memory, I/O, network

## Steps

1. **Define SLIs and targets** — what is "fast enough"
2. **Create test scenarios** — representative user journeys
3. **Set up test environment** — mirror production configuration
4. **Run baseline tests** — measure under normal conditions
5. **Stress incrementally** — increase load until breaking point
6. **Analyze results** — find bottlenecks, graph correlations
7. **Set regression thresholds** — gate CI on performance

## Rules

- Rule: define SLIs, targets, workload model, and environment before running tests.
- Rule: separate load, stress, soak, spike, and smoke test goals.
- Rule: report p50, p95, p99, throughput, error rate, and resource saturation together.
- Rule: avoid conclusions from non-representative data, cold caches, or shared noisy environments.
- Rule: turn findings into thresholds or follow-up diagnostics.

## References
- `../qa-automation/SKILL.md` — test infrastructure
- `../../foundation/observability/SKILL.md` — metrics collection
- `../../delivery/webapp-testing/SKILL.md` — e2e testing

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml