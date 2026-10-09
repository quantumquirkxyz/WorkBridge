---
name: "state-management"
category: "frontend"
maturity: "stable"
version: "1"
description: "Modern state management (Zustand, Jotai, signals, Redux Toolkit, server state)."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "State management design complete; artifact saved; completion criteria checked."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "frontend"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/state-management.json"
diataxis: "how-to"
tags: ["frontend"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: application data flow, component tree, read/write patterns, and server interaction needs.
- Output: state architecture with primitive choices, state boundaries, and data flow diagram.
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

Emit `StateManagementArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/state-management/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# State Management

Use this skill when designing state architecture for modern frontend applications — client state, server state, derived signals, and cache boundaries.


## Process

### 1. Inventory state
- Catalog all state: UI state, form state, server cache, URL state, and global domain state.
- Classify each by lifetime, owner, and read/write frequency.
- Identify derived state and computed values.

**Completion criterion:** state inventory classified by type, lifetime, and owner.

### 2. Choose primitives
- Match state type to primitive: local React state, URL/search params, React Query/TanStack Query, Zustand, Jotai, Redux Toolkit, or signals.
- Justify each choice against performance, debugging, and team familiarity needs.

**Completion criterion:** primitive selected per state type with rationale.

### 3. Define state boundaries
- Determine which components or features own which slices.
- Design action/reducer or setter patterns for each boundary.
- Plan cross-slice communication without tight coupling.

**Completion criterion:** state boundary map with ownership and update paths.

### 4. Plan server state
- Choose caching and revalidation strategy (React Query, SWR, Apollo, Relay, or router cache).
- Define stale-while-revalidate, deduplication, and invalidation rules.
- Document optimistic updates and error rollback behavior.

**Completion criterion:** server state strategy documented with caching and invalidation rules.

### 5. Handle async and derived state
- Plan loading, error, success, and empty states for each async boundary.
- Design memoization or signal derivation for expensive computed values.
- Define suspense and transition boundaries if applicable.

**Completion criterion:** async and derived state patterns documented.

## Rules

- Rule: treat URL state as the canonical source for shareable UI state.
- Rule: avoid global client state when local state, context, or URL state suffices.
- Rule: separate server cache from client state; do not store server data in global client stores without revalidation.
- Rule: keep state updates unidirectional and traceable.
- Rule: avoid normalized stores unless the data shape justifies the complexity.
- Rule: document state hydration, rehydration, and hydration mismatch handling.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml