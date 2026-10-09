---
name: "graphic-design-foundations"
category: "graphic-design"
maturity: "stable"
version: "1"
description: "Design graphic artifacts — posters, social graphics, editorial layouts, packaging, signage — with explicit composition, color, typography, and production constraints."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Graphic design foundations complete; layout, color, and typography decisions explicit; production requirements named."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "plan"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/graphic-design-foundations.json"
diataxis: "how-to"
tags: ["graphic-design"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: visual brief, audience description, distribution channel, and any brand constraints.
- Output: graphic design artifact covering composition, hierarchy, color, typography, and production requirements.
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

Emit `GraphicDesignFoundationsArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/graphic-design-foundations/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Graphic Design Foundations

Use this skill when a visual artifact needs a deliberate graphic design foundation before production. It should translate brief, audience, and channel into explicit layout, color, typography, and production decisions.


## Steps

### 1. Clarify the brief and constraints

- Identify the artifact type: poster, social graphic, editorial spread, packaging, signage, presentation deck, or report cover.
- Identify the audience: demographic, technical literacy, cultural context, and accessibility needs.
- Identify the channel: print, digital, screen, outdoor, or multi-channel.
- Identify brand constraints: existing palette, typography, logo usage, tone, and prohibited styles.

**Completion criterion:** brief summary saved with artifact type, audience, channel, and brand constraints.

### 2. Define composition and visual hierarchy

- Choose a layout structure: grid-based, modular, editorial, asymmetric, or centered.
- Define focal point and reading order.
- Allocate space for headline, body, imagery, and calls to action.
- Specify margins, bleed, and safe zones for print; padding and responsive breakpoints for digital.

**Completion criterion:** composition map or description saved.

### 3. Design the color system

- Define primary, secondary, and accent roles.
- Specify color format: HEX, RGB, CMYK, Pantone, OKLCH.
- Provide contrast ratios for text-on-background pairs where readability matters.
- Provide color-blind-safe alternatives if the palette relies on hue distinction.

**Completion criterion:** color palette with roles, values, and accessibility notes saved.

### 4. Select typography

- Pair display and body typefaces.
- Define scale: headline, subhead, body, caption, and metadata sizes.
- Specify weights, line heights, and letter spacing.
- Note licensing and embedding constraints for print and web.

**Completion criterion:** typography system with scale and licensing notes saved.

### 5. Specify production requirements

- Digital: resolution, color space, file format, compression, and maximum file size.
- Print: bleed, trim, color space, resolution, paper stock, and finishing.
- Handoff: layers, naming conventions, and asset formats for production teams.

**Completion criterion:** production requirements and handoff notes saved.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml