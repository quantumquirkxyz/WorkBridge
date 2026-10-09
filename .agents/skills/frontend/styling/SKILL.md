---
name: "styling"
category: "frontend"
maturity: "stable"
version: "1"
description: "Modern CSS (Tailwind v4, Panda CSS, CSS modules, CVA, design tokens)."
capabilities: ""
inputs:
  - type: object
    description: Brand system, component library, design requirements, and team conventions.
outputs:
  - type: object
    description: Styling architecture, token definitions, component variant strategy, and theme plan.
sideEffects: []
dependencies: []
stopCondition: "Styling design complete; artifact saved; completion criteria checked."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "frontend"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/styling.json"
diataxis: "how-to"
tags: ["frontend"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: brand system, component library, design requirements, and team conventions.
- Output: styling architecture with tool choices, token definitions, and component styling strategy.
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

Emit `StylingArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/styling/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Styling

Use this skill when designing the styling architecture for a frontend project. Record the execution traceId and link the artifact to the originating issue for review replay. — utility-first CSS, CSS modules, component variants, design tokens, and theme systems.


## Why

Styling is the visual interface contract. Making token, variant, and theme decisions explicit prevents drift, accessibility regressions, and bundle bloat.

## Process

### 1. Choose styling approach
- Evaluate utility-first (Tailwind v4, Panda CSS), CSS modules, CSS-in-JS, or hybrid.
- Consider team familiarity, bundle size, runtime cost, and DX.
- Document the chosen approach and why alternatives were rejected.

**Completion criterion:** styling approach selected with rationale.

### 2. Define design tokens
- Catalog tokens: colors (semantic and primitive), spacing scale, typography scale, shadows, radii, z-index, motion.
- Choose token format (CSS custom properties, JSON, Style Dictionary) and build pipeline.
- Define light/dark mode and theme switching strategy.

**Completion criterion:** token catalog defined with format and theme strategy.

### 3. Configure build tooling
- Set up PostCSS, Tailwind v4 config, Panda CSS config, or CSS modules pipeline.
- Define content sources for purging unused styles.
- Configure source maps, minification, and vendor prefixing.

**Completion criterion:** build tooling configured with content sources documented.

### 4. Design component variants with CVA
- Identify components with visual variants (size, intent, shape, density).
- Implement variant API using class-variance-authority or framework equivalent.
- Document compound variant rules and slot patterns.

**Completion criterion:** variant API designed for key components with type safety noted.

### 5. Plan theming and responsive behavior
- Define breakpoint strategy and responsive token variants.
- Plan dark mode, high contrast mode, and forced-colors support.
- Document CSS containment and performance considerations.

**Completion criterion:** theme, responsive, and accessibility styling strategy documented.

## Rules

- Rule: keep design tokens semantic; avoid hard-coded values in component styles.
- Rule: use utility classes for one-off styling; reserve component classes for repeated patterns.
- Rule: scope styles to prevent leakage in CSS modules or use utility discipline in utility-first.
- Rule: document the style decision authority and change process for the token system.
- Rule: verify contrast ratios for text and interactive elements in all themes.
- Rule: avoid deep selector nesting; keep specificity flat and predictable.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml