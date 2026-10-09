---
name: "scientific-hypothesis"
category: "skill-dev/sandbox"
maturity: "stable"
version: "1"
description: "Formulate testable scientific hypotheses — null/alternative, variables, controls, falsifiability — with explicit variables and statistical plan."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Formulate testable scientific hypotheses complete; required sections present; completion criteria checked."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "research"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/scientific-hypothesis.json"
diataxis: "how-to"
tags: ["research"]
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

Emit `ScientificHypothesisArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/scientific-hypothesis/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Scientific Hypothesis Design

Formulate a **scientific hypothesis** that is testable, falsifiable, and tied to measurable variables with controls.

## When to use
- The user wants to design a study, experiment, or observation.
- A claim needs to become a testable prediction.
- A research proposal needs hypothesis formulation.

## Process
1. Problem — the phenomenon to explain.
2. Hypothesis — null (H₀) and alternative (H₁); clearly stated predictions.
3. Variables — independent, dependent, control, confounding; define each with measurement method.
4. Design — experiment vs observation; randomisation; controls; blinding; sample size (power analysis).
5. Statistics — test selection (t-test, ANOVA, chi-square, regression), significance level (α), effect size, confidence intervals.
6. Deliver — artifact with H₀/H₁, variables, design, statistical plan, and limitations.

## Rules

- Rule: make the hypothesis falsifiable with an observable prediction.
- Rule: define operational measurements for every variable.
- Rule: identify confounders and controls before choosing statistical tests.
- Rule: distinguish exploratory analysis from confirmatory hypothesis testing.
- Rule: include limitations, ethical constraints, and data-quality risks.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml