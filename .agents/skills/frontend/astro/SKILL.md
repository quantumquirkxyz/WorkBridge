---
name: "astro"
category: "frontend"
maturity: "stable"
version: "1"
description: "Astro framework (islands architecture, content-focused sites, SSR/SSG, view transitions)."
capabilities: ""
inputs:
  - type: object
    description: Site content model, rendering requirements, interactivity needs, and deployment target.
outputs:
  - type: object
    description: Astro project design, island strategy, rendering mode decisions, and routing plan.
sideEffects: []
dependencies: []
stopCondition: "Astro design complete; artifact saved; completion criteria checked."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "frontend"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/astro.json"
diataxis: "how-to"
tags: ["frontend"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: site content model, rendering requirements, interactivity needs, and deployment target.
- Output: Astro project design with island strategy, rendering mode decisions, and routing plan.
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

Emit `AstroArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/astro/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Astro

Use this skill when designing or reviewing Astro projects. Record the execution traceId and link the artifact to the originating issue for review replay. — content-focused sites, islands architecture, SSR/SSG hybrid rendering, and view transitions.


## Process

### 1. Map content and routes
- Inventory content types, collections, and dynamic routes.
- Identify which pages are static, server-rendered, or edge-rendered.
- Define the routing structure and any middleware needs.

**Completion criterion:** content map and route strategy documented.

### 2. Design island architecture
- Identify interactive components that need client-side hydration.
- Choose hydration strategy per island (`visible`, `load`, `idle`, `media`, `only`).
- Determine island boundaries to minimize bundle size.

**Completion criterion:** island inventory with hydration strategies defined.

### 3. Configure rendering modes
- Set SSR/SSG per route based on freshness, personalization, and performance needs.
- Choose adapter for deployment target (Vercel, Netlify, Cloudflare, Node).
- Define on-demand rendering triggers and caching policy.

**Completion criterion:** rendering mode per route documented with rationale.

### 4. Design view transitions
- Plan animated transitions between routes where they improve UX.
- Use `view-transition` API or Astro's `transition:` directives.
- Define fallback for browsers without view transition support.

**Completion criterion:** transition map created with progressive enhancement noted.

### 5. Plan integrations and content
- Configure content collections, schemas, and TypeScript types.
- Define CMS integration strategy if applicable.
- Set up image optimization, RSS feeds, and sitemap.

**Completion criterion:** content layer and integrations planned.

## Rules

- Rule: prefer static rendering by default; justify every SSR route with a concrete need.
- Rule: keep client-side islands small, lazy-loaded, and independently hydratable.
- Rule: use content collections for type-safe content management.
- Rule: design for progressive enhancement; view transitions must not block navigation.
- Rule: define caching and revalidation strategy at the route level.
- Rule: separate data-fetching logic from UI components to keep islands shallow.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml