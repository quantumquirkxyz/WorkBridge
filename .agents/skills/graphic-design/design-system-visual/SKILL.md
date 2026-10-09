---
name: "design-system-visual"
category: "graphic-design"
maturity: "stable"
version: "1"
description: "Design visual design systems — tokens, components, patterns, and documentation — with explicit hierarchy, accessibility, and cross-channel consistency."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Visual design system design complete; tokens, components, accessibility, and adaptation rules explicit."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "plan"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/design-system-visual.json"
diataxis: "how-to"
tags: ["graphic-design"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: brand constraints, platform targets (web, mobile, print, outdoor), accessibility requirements, and existing visual assets.
- Output: visual design system artifact with token taxonomy, component patterns, accessibility rules, and cross-channel guidelines.
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

Emit `DesignSystemVisualArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/design-system-visual/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Design System Visual

Use this skill when a product or brand needs a coherent visual design system. It should translate brand and accessibility requirements into explicit design tokens, component patterns, and cross-channel adaptation rules.


## Steps

### 1. Define token taxonomy

- **Global tokens:** raw values for color, typography, spacing, elevation, motion.
- **Alias tokens:** semantic names mapped to global tokens.
- **Component tokens:** component-specific mappings from alias tokens.
- Specify format: JSON, CSS custom properties, Figma variables, or design-token JSON.

**Completion criterion:** token taxonomy with examples saved.

### 2. Specify color system

- Define color roles: primary, secondary, accent, neutral, semantic.
- Provide values for each role in all required formats.
- Define opacity scale for overlays and disabled states.
- Specify dark mode mappings if applicable.

**Completion criterion:** color system with token names and values saved.

### 3. Specify typography scale

- Define type scale: display, h1–h6, body, small, caption.
- Specify font family, weight, line height, letter spacing, and paragraph spacing for each level.
- Define responsive scale if platform requires it.

**Completion criterion:** typography scale with token names and values saved.

### 4. Define spacing and layout

- Define spacing scale: base unit and multiples.
- Define grid system: columns, gutters, margins.
- Define breakpoints for responsive behavior.
- Define container max-widths.

**Completion criterion:** spacing and layout system saved.

### 5. Define component patterns and states

- Document patterns for: buttons, inputs, cards, navigation, modals, tables, alerts.
- For each pattern: anatomy, content guidelines, spacing, states, and accessibility notes.
- Specify elevation and shadow tokens for layered surfaces.

**Completion criterion:** component pattern catalog with states saved.

### 6. Document accessibility requirements

- For each component and token: specify contrast, focus indicator, keyboard behavior, and screen reader treatment.
- Document color-blind-safe alternatives.
- Document motion preferences: reduced motion defaults.

**Completion criterion:** accessibility requirements documented per component and token.

### 7. Define cross-channel adaptation rules

- Digital: screen-specific adaptations, interaction states, responsive behavior.
- Print: static adaptations, color space conversion, layout constraints.
- Outdoor: high-contrast adaptations, simplified messaging, size constraints.

**Completion criterion:** cross-channel adaptation rules saved.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml