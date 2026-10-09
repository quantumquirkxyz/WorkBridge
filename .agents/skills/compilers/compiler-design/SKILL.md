---
name: "compiler-design"
category: "compilers"
maturity: "stable"
version: "1"
description: "Design compiler pipelines — lexing, parsing, ASTs, type checking, IR, optimization, and code generation — with correctness and modularity."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Pipeline stages, representations, invariants, and validation strategy are explicit."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "plan"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/compiler-design.json"
diataxis: "how-to"
tags: ["compilers"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: language goals, syntax/semantics, target runtime, existing architecture, and correctness constraints.
- Output: pipeline design with stages, representations, invariants, diagnostics, and validation plan.
- Scope: keep representations explicit so later stages do not depend on parser accidents or source-text trivia.
- Rule: keep representations explicit so later stages do not depend on parser accidents or source-text trivia.
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

Emit `CompilerDesignArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/compiler-design/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# compiler-design

Use this skill when designing or changing a compiler, interpreter, transpiler, parser, type checker, optimizer, or code-generation pipeline.


## Rules

- Rule: define the source language subset and target behavior before choosing representations.
- Rule: separate parsing, binding/name resolution, type checking, lowering, optimization, and emission concerns.
- Rule: state invariants for AST, typed AST, IR, and emitted artifacts.
- Rule: design diagnostics with source spans, recovery behavior, and stable error codes where useful.
- Rule: validate each stage with the smallest artifact that proves its contract.

## Steps

1. Define source constructs, semantic rules, and target runtime constraints.
2. Choose pipeline stages and representation boundaries.
3. Specify symbol, scope, type, and error models.
4. Decide IR shape, lowering rules, and optimization boundaries.
5. Plan code generation or interpretation and runtime integration.
6. Define stage-level validation, diagnostics, and regression strategy.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml