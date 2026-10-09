---
name: "compilers"
category: "compilers"
maturity: "stable"
version: "1"
description: "Design and implement compilers and interpreters — lexer, parser, AST, type checking, code generation, optimization — with correctness and modularity."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Design and implement compilers and interpreters complete; artifact saved; completion criteria checked."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "compilers"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/compilers.json"
diataxis: "how-to"
tags: ["compilers"]
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

Emit `CompilersArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/compilers/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# compilers

Design and implement compilers and interpreters — lexer, parser, AST, type checking, code generation, optimization — with correctness and modularity.

## Goals
- Build a correct front-end (lexer → parser → AST)
- Implement type checking or interpretation
- Generate valid output (bytecode, IR, machine code)
- Structure the compiler for extension and testing


## Compiler Phases

```
Source → Lexer → Tokens → Parser → AST
                               ↓
                    Semantic Analysis (type check)
                               ↓
                    Optimization (optional)
                               ↓
                    Code Generation → Target
```

## Steps

1. **Define the grammar** — EBNF, ensure it is unambiguous
2. **Implement the lexer** — token stream, handle lexing errors
3. **Implement the parser** — recursive descent, LL(1), or LR
4. **Build the AST** — visitor pattern for traversal
5. **Add semantic analysis** — scope, type checking, symbol table
6. **Generate output** — bytecode, IR, or native code
7. **Add optimization passes** — dead code elimination, constant folding
8. **Write tests** — golden tests, fuzzing, property-based testing

## Rules

- Rule: define grammar and semantics before selecting parser or IR implementation details.
- Rule: keep lexer, parser, semantic analysis, and code generation boundaries explicit.
- Rule: validate each phase with a narrow oracle before testing the full pipeline.
- Rule: preserve source spans and diagnostics through transformations.
- Rule: do not add optimization passes until correctness and observability are stable.

## References
- `../os/SKILL.md` — system calls for code execution
- `../../cs/cs-algorithms/SKILL.md` — parsing algorithms
- `../../math/math-formal-proof/SKILL.md` — correctness proofs

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml