---
description: "Design compiler pipelines — lexing, parsing, ASTs, type checking, IR, optimization, and code generation — with correctness and modularity."
---
# compiler-design

When to use: Design compiler pipelines — lexing, parsing, ASTs, type checking, IR, optimization, and code generation — with correctness and modularity.

## Workflow

1. Define source constructs, semantic rules, and target runtime constraints
2. Choose pipeline stages and representation boundaries
3. Specify symbol, scope, type, and error models
4. Decide IR shape, lowering rules, and optimization boundaries
5. Plan code generation or interpretation and runtime integration
6. Define stage-level validation, diagnostics, and regression strategy

## Deliverables

- plan artifact

## Guardrails

- risk: low; trust tier: 1; approval required: no
- side effects: none
- isolation: none; model tier: reasoning

Stop when: Pipeline stages, representations, invariants, and validation strategy are explicit.
