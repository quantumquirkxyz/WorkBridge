---
name: "structured-output"
category: "ai"
maturity: "stable"
version: "1"
description: "Structured output for LLMs (JSON mode, function calling, constrained decoding, validation)"
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Structured output green on acceptance suite with validation harness."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "ai"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/structured-output.json"
diataxis: "how-to"
tags: ["ai"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: task description, output schema, acceptance criteria, edge cases.
- Output: output schema + prompt + validation harness + retry discipline.
- Scope: designs and validates structured output; does not deploy to production.
- Rule: designs and validates structured output; does not deploy to production.
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

Emit `StructuredOutputArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/structured-output/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Structured Output

Produce reliable, parseable structured output from LLMs with validation and fallback.

## Process

### 1. Output schema
Define: JSON Schema or TypeScript type; required, optional, enum, format.
Examples: minimal, typical, edge, error; examples with schema.

**Completion criterion:** output schema with examples and validation rules.

### 2. Prompt and contract
System: intent, constraints, format instructions, schema.
User: task, inputs, examples, output format.
Function: name, description, parameters with type and enum.
Format: JSON, Markdown, list, or type.

**Completion criterion:** prompt and contract with schema, function, format instructions.

### 3. Constrained decoding
Grammar: context-free or regex; production rules for schema.
Stop tokens: EOS, eot, end of JSON, end of function.
Retry: exponential backoff, retry budget, circuit breaker, pager.

**Completion criterion:** grammar or regex with stop tokens and retry discipline.

### 4. Validation harness
Unit: schema, type, format, required, enum.
Integration: end-to-end with LLM and contract.
Property: multiple examples with schema and edge cases.
Business: business rule, semantic check, human approval.

**Completion criterion:** validation harness with unit, integration, property, business checks.

### 5. Retry and fallback
Parse failure: retry with repair, fallback to simpler model, circuit breaker, pager.
Fallback: simpler output, human, template, or rule.
Retry: exponential backoff, retry budget, circuit breaker, pager.

**Completion criterion:** retry and fallback discipline with retry, fallback, circuit breaker, pager.

## Rules

- No structured output accepted without validation green.
- No grammar accepted without coverage on edge cases.
- No retry discipline accepted without circuit breaker and pager.
- No fallback accepted without human or template escalation.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml