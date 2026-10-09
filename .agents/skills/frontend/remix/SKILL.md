---
name: "remix"
category: "frontend"
maturity: "stable"
version: "1"
description: "Remix framework (loaders, actions, nested routes, progressive enhancement)."
capabilities: ""
inputs:
  - type: object
    description: Route map, data requirements, mutation patterns, and user interaction flows.
outputs:
  - type: object
    description: Remix route design, loader/action plan, data flow, and progressive enhancement strategy.
sideEffects: []
dependencies: []
stopCondition: "Remix design complete; artifact saved; completion criteria checked."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "frontend"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/remix.json"
diataxis: "how-to"
tags: ["frontend"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: route map, data requirements, mutation patterns, and user interaction flows.
- Output: Remix route design with loader/action plan, data flow, and progressive enhancement strategy.
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

Emit `RemixArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/remix/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Remix

Use this skill when designing or reviewing Remix applications. Record the execution traceId and link the artifact to the originating issue for review replay. — loaders, actions, nested routes, mutations, and progressive enhancement.


## Process

### 1. Map nested routes
- Identify layout hierarchy, outlet structure, and parallel routes.
- Define which routes are index routes, parent layouts, or leaf pages.
- Plan error boundaries and CatchBoundary placement.

**Completion criterion:** nested route tree documented with boundaries marked.

### 2. Design loaders and data flow
- For each route: define loader function, required parameters, and data dependencies.
- Choose between parallel and dependent loaders.
- Document caching strategy and revalidation triggers.

**Completion criterion:** loader plan per route with dependencies and caching noted.

### 3. Define actions and mutations
- Identify mutation points: form submissions, optimistic updates, and side effects.
- Design action functions with intent-based routing (`intent` or named actions).
- Plan error handling and optimistic UI patterns.

**Completion criterion:** mutation map with action responsibilities and error strategy.

### 4. Plan progressive enhancement
- Ensure forms submit natively without JavaScript.
- Use `useNavigation` and `useSubmit` for client-side enhancement only.
- Design fallback loading and error states for non-JS users.

**Completion criterion:** enhancement strategy documented with non-JS fallback verified.

### 5. Configure integrations
- Define session management, cookie strategy, and auth boundaries.
- Plan external API integration via loaders or server utilities.
- Set up Vite, deploy target, and adapter.

**Completion criterion:** auth, session, and deployment configuration planned.

## Rules

- Rule: keep loaders and actions close to the route they serve; avoid centralizing data logic.
- Rule: never trust client state for authoritative data; loaders are the source of truth.
- Rule: use form actions over fetch-based mutations for accessibility and progressive enhancement.
- Rule: place error boundaries at logical route boundaries where failures should be isolated.
- Rule: cache loader responses explicitly; avoid over-fetching or under-fetching per route.
- Rule: keep mutations idempotent and side-effect-free on revalidation.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml