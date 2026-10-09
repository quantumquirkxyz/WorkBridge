---
name: "xr-performance"
category: "xr"
maturity: "stable"
version: "1"
description: "Optimize XR performance — frame rate, motion-to-photon latency, asset budgets, and thermal constraints — with comfort-aware trade-offs."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "XR performance targets, profiling evidence, and comfort trade-offs are explicit."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "xr"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/xr-performance.json"
diataxis: "how-to"
tags: ["xr"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: target device, runtime, scene complexity, performance targets, profiling data, and interaction requirements.
- Output: XR performance budget, bottleneck analysis, optimization plan, and comfort validation checks.
- Scope: prioritize sustained comfort and stable frame pacing over peak visual fidelity.
- Rule: prioritize sustained comfort and stable frame pacing over peak visual fidelity.
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

Emit `XrPerformanceArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/xr-performance/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# xr-performance

Use this skill when optimizing AR/VR/MR frame rate, latency, thermal behavior, asset budgets, tracking stability, or comfort-sensitive rendering performance.


## Rules

- Rule: define target frame rate, motion-to-photon latency, and device thermal budget.
- Rule: separate CPU, GPU, memory, asset, tracking, and network bottlenecks.
- Rule: include frame pacing, reprojection, and dropped-frame behavior where the platform exposes it.
- Rule: treat comfort regressions as performance failures.
- Rule: validate on target hardware, not only desktop simulators.

## Steps

1. Identify device, runtime, target frame rate, interaction mode, and scene constraints.
2. Capture baseline profiling for CPU, GPU, memory, frame timing, and thermals.
3. Identify dominant bottlenecks and comfort risks.
4. Recommend optimizations: LODs, batching, occlusion, shader simplification, asset budgets, foveation, or interaction changes.
5. Define acceptance tests on target hardware.
6. Document trade-offs and regression checks.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml