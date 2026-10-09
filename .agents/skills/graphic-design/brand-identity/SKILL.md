---
name: "brand-identity"
category: "graphic-design"
maturity: "stable"
version: "1"
description: "Design brand identity systems — logo, color, typography, imagery, iconography, voice, and usage rules — with explicit consistency, scalability, and governance."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Brand identity design complete; strategy, visual system, and usage rules explicit; governance named."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "graphic-design"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/brand-identity.json"
diataxis: "how-to"
tags: ["graphic-design"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: brand strategy brief, audience, market context, and existing visual assets.
- Output: brand identity artifact covering strategy, logo system, color, typography, imagery, iconography, and usage governance.
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

Emit `BrandIdentityArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/brand-identity/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Brand Identity

Use this skill when a brand needs a coherent visual and verbal identity system. It should translate strategy into explicit logo, color, typography, imagery, iconography, and usage rules that scale across channels.


## Steps

### 1. Define brand strategy and positioning

- State brand purpose, values, and personality.
- Define audience segments and their expectations.
- Identify competitive positioning and differentiation.
- Document tonal voice and messaging pillars.

**Completion criterion:** brand strategy and positioning saved.

### 2. Design the logo system

- Define primary logo, wordmark, and symbol marks.
- Specify logo variations: horizontal, stacked, icon-only, monochrome.
- Define minimum clear space around each logo variation.
- Specify minimum size for digital and print use.
- Provide do and don't examples for logo usage.

**Completion criterion:** logo system with variations and clear-space rules saved.

### 3. Establish the color palette

- Define primary, secondary, and accent colors with values.
- Specify color formats: HEX, RGB, CMYK, Pantone, OKLCH.
- Provide contrast ratios for text-on-background pairs.
- Define neutral palette: grays, off-whites, and near-blacks.
- Specify color usage hierarchy and prohibited combinations.

**Completion criterion:** color palette with values, formats, and usage hierarchy saved.

### 4. Define typography system

- Select primary and secondary typefaces.
- Define scale: display, headline, subhead, body, caption.
- Specify weights, line heights, letter spacing, and paragraph spacing.
- Document licensing and embedding rules.
- Specify fallback fonts for digital and print.

**Completion criterion:** typography system with scale and licensing saved.

### 5. Define imagery and iconography style

- Describe photography style: subject, lighting, composition, color grading.
- Describe illustration style: line weight, color, detail level.
- Define iconography system: grid, stroke width, corner radius, color usage.
- Specify image treatments and prohibited stock photo characteristics.

**Completion criterion:** imagery and iconography style guide saved.

### 6. Document usage governance

- Define co-branding rules and minimum clear space.
- Specify background contexts where the logo and colors must adapt.
- List prohibited uses: stretching, recoloring, adding effects, placing on busy backgrounds without contrast.
- Define approval workflow for new applications and exceptions.

**Completion criterion:** usage governance and approval workflow saved.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml