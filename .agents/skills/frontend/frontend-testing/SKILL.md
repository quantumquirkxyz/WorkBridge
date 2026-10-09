---
name: "frontend-testing"
category: "frontend"
maturity: "stable"
version: "1"
description: "Frontend testing (Vitest, Testing Library, Playwright, visual testing, Storybook)."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Frontend testing design complete; artifact saved; completion criteria checked."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "test-strategy"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/frontend-testing.json"
diataxis: "how-to"
tags: ["frontend"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: component library, user flows, CI environment, and quality requirements.
- Output: test strategy with test tiers, tool configuration, coverage targets, and execution plan.
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

Emit `FrontendTestingArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/frontend-testing/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Frontend Testing

Use this skill when designing the test strategy for a frontend application — unit tests, integration tests, end-to-end tests, visual regression, and Storybook workflows.


## Process

### 1. Define test tiers
- **Unit:** pure functions, utilities, hooks, and isolated components.
- **Integration:** component composition, context providers, and API boundary mocks.
- **E2E:** critical user journeys across routes and real browser behavior.
- **Visual:** UI regression via screenshots, Chromatic, or Playwright visual comparisons.

**Completion criterion:** test tiers defined with scope and ownership per tier.

### 2. Configure test runners
- Set up Vitest or Jest for unit/integration tests with jsdom or happy-dom.
- Configure Playwright or Cypress for E2E with browser matrix (Chromium, Firefox, WebKit).
- Set up Storybook for component isolation and interaction testing.

**Completion criterion:** test runner configuration documented with CI integration.

### 3. Write testing conventions
- Define file naming (`*.test.ts`, `*.spec.tsx`), directory structure, and test grouping.
- Establish mocking policy: MSW for network, jest.mock for modules, fake timers for time.
- Document accessibility assertions (jest-axe, Playwright a11y checks).

**Completion criterion:** testing conventions documented with examples.

### 4. Plan visual testing
- Define Storybook stories per component and interaction state.
- Set up visual regression workflow with baseline management.
- Plan screenshot testing for responsive breakpoints and themes.

**Completion criterion:** visual testing workflow documented with toolchain.

### 5. Define coverage and quality gates
- Set coverage thresholds for critical paths (not necessarily 100% everywhere).
- Configure CI to fail on flaky tests, accessibility violations, or visual regressions.
- Plan test data strategy: factories, fixtures, MSW handlers, and seed data.

**Completion criterion:** coverage targets, quality gates, and test data strategy documented.

## Rules

- Rule: test behavior the user experiences, not component internals.
- Rule: keep tests independent; no shared mutable state between tests.
- Rule: use Testing Library queries that match how users perceive the UI.
- Rule: run unit tests on every commit; E2E on PR merge to main or on schedule.
- Rule: quarantine and fix flaky tests immediately; never accept flakiness as normal.
- Rule: pair visual testing with behavior tests; screenshots alone do not prove correctness.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml