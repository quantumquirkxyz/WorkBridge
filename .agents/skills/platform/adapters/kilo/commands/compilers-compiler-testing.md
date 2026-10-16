---
description: "Test compilers and interpreters — parser tests, semantic tests, IR validation, golden tests, and regression checks — with explicit oracle design."
---
# compiler-testing

When to use: Test compilers and interpreters — parser tests, semantic tests, IR validation, golden tests, and regression checks — with explicit oracle design.

## Workflow

1. Map compiler stages and externally visible behavior
2. Identify fixture classes for syntax, semantics, diagnostics, IR, optimization, and runtime
3. Choose oracles for each stage and decide where golden tests are appropriate
4. Add negative and recovery tests for invalid programs
5. Tie known bugs to regression fixtures
6. Define minimization, naming, and update rules for fixtures

## Deliverables

- test-strategy artifact

## Guardrails

- risk: low; trust tier: 1; approval required: no
- side effects: none
- isolation: none; model tier: reasoning

Stop when: Test oracles, fixture classes, and regression checks are explicit.
