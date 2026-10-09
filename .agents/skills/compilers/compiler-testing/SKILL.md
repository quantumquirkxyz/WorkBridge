---
name: "compiler-testing"
category: "compilers"
maturity: "stable"
version: "1"
description: "Test compilers and interpreters — parser tests, semantic tests, IR validation, golden tests, and regression checks — with explicit oracle design."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Test oracles, fixture classes, and regression checks are explicit."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "test-strategy"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/compiler-testing.json"
diataxis: "how-to"
tags: ["compilers"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: language surface, compiler stages, existing fixtures, known bugs, and target runtime behavior.
- Output: test matrix with fixture types, expected oracles, golden strategy, and regression checks.
- Scope: do not rely on golden files alone when structural invariants or diagnostics need stronger oracles.
- Rule: do not rely on golden files alone when structural invariants or diagnostics need stronger oracles.
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

Emit `CompilerTestingArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/compiler-testing/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# compiler-testing

Use this skill when planning tests for a compiler, interpreter, transpiler, parser, type checker, optimizer, or code generator.


## Rules

- Rule: test each pipeline stage at the narrowest reliable boundary.
- Rule: include positive, negative, malformed, boundary, and regression fixtures.
- Rule: define the oracle: parse tree, typed AST, diagnostics, IR, output behavior, or runtime result.
- Rule: keep diagnostics tests stable by checking meaning, location, and code rather than incidental wording when possible.
- Rule: verify optimizer tests preserve semantics, not only textual IR shape.

## Steps

1. Map compiler stages and externally visible behavior.
2. Identify fixture classes for syntax, semantics, diagnostics, IR, optimization, and runtime.
3. Choose oracles for each stage and decide where golden tests are appropriate.
4. Add negative and recovery tests for invalid programs.
5. Tie known bugs to regression fixtures.
6. Define minimization, naming, and update rules for fixtures.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml