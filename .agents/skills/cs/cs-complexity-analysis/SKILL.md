---
name: "cs-complexity-analysis"
category: "cs"
maturity: "stable"
version: "1"
description: "Analyze algorithmic complexity — time, space, amortized cost, and lower bounds — with explicit assumptions and proof sketches."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Complexity bounds are stated, justified, and tied to the chosen input model."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "cs"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/cs-complexity-analysis.json"
diataxis: "how-to"
tags: ["cs"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: algorithm, pseudocode, implementation, recurrence, or data-structure operation.
- Output: time and space bounds with assumptions, proof sketch, and meaningful constants or bottlenecks when relevant.
- Scope: call out input model, operation costs, and whether average, worst, best, or amortized analysis is being used.
- Rule: call out input model, operation costs, and whether average, worst, best, or amortized analysis is being used.
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

Emit `CsComplexityAnalysisArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/cs-complexity-analysis/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# cs-complexity-analysis

Use this skill when a task asks how an algorithm scales, why one approach is faster, how much memory is needed, or whether an optimization changes asymptotic behavior.


## Rules

- Rule: define `n` and every secondary variable before using a bound.
- Rule: distinguish worst-case, expected, amortized, and empirical performance.
- Rule: include space complexity separately from time complexity.
- Rule: solve recurrences with a named method when the recurrence is non-trivial.
- Rule: do not claim an optimization improves complexity unless the dominant term changes.

## Steps

1. Identify inputs, size variables, and cost model.
2. Break the algorithm into loops, recursive calls, operations, and data-structure interactions.
3. Derive local costs and combine them into a total bound.
4. Simplify the asymptotic expression while preserving meaningful parameters.
5. Check tightness or give upper/lower bounds when exact tightness is unclear.
6. Explain trade-offs and edge cases that affect real performance.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml