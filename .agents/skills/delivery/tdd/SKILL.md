---
name: tdd
category: delivery
maturity: stable
version: 1
description: Test-driven development. Use when the user wants to build features or fix bugs test-first, mentions "red-green-refactor"
capabilities:
  - apply tdd workflow
  - produce tdd artifact
  - validate tdd completion criteria
inputs:
  - feature or bug request
  - current codebase state
  - agreed seam list
outputs:
  - type: object
    description: TDD implementation artifact with tests and validation notes
    properties:
      tests:
        type: array
        items:
          type: object
          properties:
            name:
              type: string
            seam:
              type: string
            status:
              type: string
              enum: [red, green]
            assertionCount:
              type: integer
      implementation:
        type: object
        properties:
          seam:
            type: string
          changes:
            type: array
            items:
              type: object
              properties:
                file:
                  type: string
                changeType:
                  type: string
                  enum: [added, modified]
      validationNotes:
        type: array
        items:
          type: string
      completionCriteriaMet:
        type: boolean
modelTier: code
promptVersion: "2.0"
artifactType: implementation
evaluators:
  - behavioral
  - regression
  - traceability
  - quality-bar
fixturesPath: .agents/skills/platform/fixtures/behavioral/tdd.json
diataxis: how-to
tags: [tdd, testing, delivery, implementation]
compatibility: [implement, code-review]
approvalRequired: false
approvalFor: []
sideEffects: []
dependencies: []
stopCondition: Test-driven development complete; structured result returned; completion criteria checked.
risk: low
trustTier: 1
maxIterations: 6
---

## Why

Bugs caught in the red phase of TDD cost nothing to fix. The developer wrote a failing test, wrote the minimal code to pass it, and confirmed the fix in the same mental context. There is no need to reproduce the bug, no need to trace through unfamiliar code, no need to explain the failure to a colleague who was not present when it was written.

Bugs caught in production follow a different cost curve. First there is the time to reproduce — sometimes hours or days for intermittent failures. Then there is the investigation: tracing through the call stack, understanding why the code behaves differently than expected, and identifying the root cause. Then there is the fix, the regression test, the review, the deploy, and the monitoring to confirm the fix worked. Each step multiplies the cost because the bug has left the developer's working memory.

TDD catches bugs cheaper because it shrinks the feedback loop from "days in production" to "seconds in the editor." The failing test IS the bug report. The green test IS the fix. No handoff, no context switch, no investigation budget burned on something the developer already understands.

Beyond cost, TDD produces executable documentation. A test that passes is a proof that the behavior exists. Static documentation describes what the code should do; a passing test demonstrates that it does. As the codebase evolves, the test suite stays current because it must pass — or the build fails.

## Contract

- **Input:** feature or bug request, current codebase state, and seam list.
- **Output:** a red→green implementation trace: failing tests, minimal passing code, and refactor notes.
- **Scope:** one test at a time; no speculative implementation.
- **Rule:** write the failing test first, then only enough code to pass it.
- **Rule:** test only at pre-agreed seams — confirm them before writing any test.
- **Rule:** refactoring belongs to the review stage, not the red→green cycle.

## Provenance

| Quality-Bar Question | Evidence |
|---|---|
| **Intent** | Test-driven development. Use when the user wants to build features or fix bugs test-first, mentions "red-green-refactor" |
| **Input** | feature or bug request, current codebase state, and seam list. |
| **Output** | a red→green implementation trace: failing tests, minimal passing code, and refactor notes. |
| **Side effects** | none. |
| **Boundaries** | one test at a time; no speculative implementation. |
| **Completion criteria** | each test fails before implementation; each test passes with minimal code; tests survive refactor; no implementation-coupled or tautological tests. |

## Artifact

This skill emits a structured implementation artifact (JSON) capturing the red→green cycle state, and the test and implementation files themselves. The JSON is the machine-readable cycle log; the code files are the persistent artifact. Both are emitted together so the cycle stays auditable.

The `TddArtifact` records each cycle's traceId, the seam under test, the assertion count, and the status transition (red → green). This execution record enables post-cycle quality analysis: which seams had the most cycles, which assertions failed first, and where refactoring introduced regressions. The artifact schema version is included so downstream review stages can validate the artifact shape before consuming it.

## Process

### 1. Confirm seams

Before writing any test, confirm the seams under test with the user. Write down each seam and verify it is the highest boundary that still verifies the required behavior. No test is written at an unconfirmed seam.

### 2. Write the failing test (red)

Write one test at the confirmed seam. Name it after the behavior, not the implementation. The test must fail before any implementation code is written. If it does not fail, the test is tautological — the assertion passes without the code it is supposed to verify.

Keep the test minimal: one behavior, one assertion set. Do not write multiple tests in the red phase. One test per cycle.

### 3. Write the passing code (green)

Write only enough implementation to make the failing test pass. Do not add features the test does not require. Do not refactor existing code. Do not write the next test early.

Commit the red→green pair with a conventional commit message.

### 4. Repeat

Return to step 2. Each cycle produces one tracer bullet. The accumulating suite is the safety net. Continue until the feature or bug fix is complete.

### 5. Refactor (post-cycle)

Refactoring is not part of the red→green cycle. After all cycles are complete, review the implementation for duplication, unclear naming, and missed abstractions. Run the full suite after each refactoring step to confirm no behavior was lost. See the `code-review` skill for the refactor review stage.

## Completion

- all cycles follow the red → green → refactor discipline
- every test is at a pre-agreed seam and survives refactors
- no implementation-coupled or tautological tests remain
- `TddArtifact` emitted and validated

# Test-Driven Development

TDD is the red → green loop. This skill is the reference that makes that loop produce tests worth keeping: what a good test is, where tests go, the anti-patterns, and the rules of the loop. Every section applies on every cycle — consult them before and during the loop, not after.

When exploring the codebase, read `CONTEXT.md` (if it exists) so test names and interface vocabulary match the project's domain language, and respect ADRs in the area you're touching.

## What a good test is

Tests verify behavior through public interfaces, not implementation details. Code can change entirely; tests shouldn't. A good test reads like a specification — "user can checkout with valid cart" tells you exactly what capability exists — and survives refactors because it doesn't care about internal structure.

See [`references/test-patterns.md`](references/test-patterns.md) for good patterns and [`references/anti-patterns.md`](references/anti-patterns.md) for the patterns to avoid. See [tests.md](tests.md) for examples and [mocking.md](mocking.md) for mocking guidelines.

## Seams — where tests go

A **seam** is the public boundary you test at: the interface where you observe behavior without reaching inside. Tests live at seams, never against internals.

**Test only at pre-agreed seams.** Before writing any test, write down the seams under test and confirm them with the user. No test is written at an unconfirmed seam. You can't test everything — agreeing the seams up front is how testing effort lands on the critical paths and complex logic instead of every edge case.

Ask: "What's the public interface, and which seams should we test?"

## Anti-patterns

These patterns produce tests that look like coverage but fail when you need them most. See [`references/anti-patterns.md`](references/anti-patterns.md) for detailed treatments.

- **Implementation-coupled** — mocks internal collaborators, tests private methods, or verifies through a side channel (querying the database instead of using the interface). The tell: the test breaks when you refactor but behavior hasn't changed.
- **Tautological** — the assertion recomputes the expected value the way the code does (`expect(add(a, b)).toBe(a + b)`, a snapshot derived by hand the same way, a constant asserted equal to itself), so it passes by construction and can never disagree with the code. Expected values must come from an independent source of truth — a known-good literal, a worked example, the spec.
- **Horizontal slicing** — writing all tests first, then all implementation. Bulk tests verify _imagined_ behavior: you test the _shape_ of things rather than user-facing behavior, the tests go insensitive to real changes, and you commit to test structure before understanding the implementation. Work in **vertical slices** instead — one test → one implementation → repeat, each test a **tracer bullet** that responds to what the last cycle taught you.

## Rules of the loop

- **Red before green.** Write the failing test first, then only enough code to pass it. Don't anticipate future tests or add speculative features.
- **One slice at a time.** One seam, one test, one minimal implementation per cycle.
- **Rule: after each red-green cycle (one test → one implementation), commit the changes with a conventional commit message.**
- **Refactoring is not part of the loop.** It belongs to the review stage (see the `code-review` skill), not the red → green implementation cycle.

---
@include .agents/skills/platform/contract-base.xml
