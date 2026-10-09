---
name: "performance"
category: "platform"
maturity: "stable"
version: "1"
description: "Measure and improve system performance — latency, throughput, resource usage, bottlenecks, and capacity planning — with reproducible profiling."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Performance target, measurements, bottleneck, and validation plan are explicit."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "platform/performance"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/performance.json"
diataxis: "how-to"
tags: ["platform/performance"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: performance goal, workload, architecture, measurements, environment, and suspected bottlenecks.
- Output: performance hypothesis, profiling plan, bottleneck analysis, remediation options, and validation criteria.
- Scope: do not optimize without a measurable target and representative workload.
- Rule: do not optimize without a measurable target and representative workload.
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

Emit `PerformanceArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/performance/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Performance

Use this skill when diagnosing or improving latency, throughput, resource usage, scalability, capacity, or performance regressions in a system.


## Rules

- Rule: define the target metric, workload, and measurement environment before interpreting results.
- Rule: separate latency percentiles, throughput, saturation, utilization, and error rate.
- Rule: compare baseline and changed behavior with the same workload.
- Rule: identify the limiting resource before prescribing changes.
- Rule: include regression checks so improvements do not silently degrade later.

## Steps

1. Define user-visible target, SLO or benchmark, workload, and environment.
2. Gather baseline measurements and instrumentation gaps.
3. Build hypotheses about bottlenecks across CPU, memory, I/O, network, locks, and external services.
4. Profile at the narrowest seam that can confirm or reject the hypothesis.
5. Recommend remediation with trade-offs and expected impact.
6. Define validation, regression checks, and rollout monitoring.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml