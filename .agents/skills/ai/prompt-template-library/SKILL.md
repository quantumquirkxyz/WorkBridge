---
name: "prompt-template-library"
category: "ai"
maturity: "stable"
version: "1"
description: "Prompt template library (versioned templates, A/B testing, composition, evaluation)"
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Templates green on acceptance suite with evaluation and fallback."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "pull-request"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/prompt-template-library.json"
diataxis: "how-to"
tags: ["ai"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: task description, template spec, acceptance criteria, edge cases.
- Output: template manifest + A/B spec + composition library + evaluation suite + fallback discipline.
- Scope: designs and validates templates; does not deploy to production.
- Rule: designs and validates templates; does not deploy to production.
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

Emit `PromptTemplateLibraryArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/prompt-template-library/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Prompt Template Library

Manage, compose, test, and evaluate prompt templates with discipline.

## Process

### 1. Template manifest
Version: semver or git sha; spec: intent, inputs, outputs, format, acceptance.
Promotion: staged to production after acceptance green.
Rollback: prior tagged version with reproduction and reconciliation.

**Completion criterion:** template manifest with version, spec, promotion, rollback.

### 2. A/B experiment
Hypothesis: template variant improves acceptance metric.
Traffic split: staged ramp; success criteria; duration; sample size.
Guardrail: latency, cost, error rate must stay within budgets.

**Completion criterion:** experiment spec with hypothesis, variants, success criteria, duration.

### 3. Composition library
Partials: reusable prompt, system, instruction, example.
Conditionals: if, elif, else, switch, inline, macro.
Loops: for, foreach, while, map, filter, reduce.
Composition: partials, conditionals, loops with validation.

**Completion criterion:** composition library with partials, conditionals, loops, validation.

### 4. Evaluation suite
Acceptance: human check, machine check, acceptance metric.
Property: multiple examples with template and edge cases.
Regression: prior version with acceptance and edge checks.
Report: metrics, failure mode, edge case, recommendation.

**Completion criterion:** evaluation suite with acceptance, property, regression, report.

### 5. Fallback and escalation
Parse failure: retry with repair, fallback to simpler model, circuit breaker, pager.
Fallback: simpler output, human, template, or rule.
Retry: exponential backoff, retry budget, circuit breaker, pager.

**Completion criterion:** fallback and escalation discipline with retry, fallback, circuit breaker, pager.

## Rules

- No template accepted without acceptance suite green.
- No composition accepted without property checks green.
- No A/B lift accepted without guardrail metrics green.
- No fallback accepted without escalation path tested.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml