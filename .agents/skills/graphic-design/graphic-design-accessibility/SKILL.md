---
name: "graphic-design-accessibility"
description: "Design inclusive graphic artifacts — WCAG-compliant visuals, colorblind-safe palettes, readable typography, and assistive-technology-compatible layouts for print and digital."
promptVersion: "2.0"
artifactType: "plan"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/graphic-design-accessibility.json"
diataxis: "how-to"
tags: ["graphic-design"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: design brief, visual content requirements, WCAG level target, and accessibility constraints.
- Output: accessible design specification with compliance report and remediation guidance.
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

Emit `GraphicDesignAccessibilityArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/graphic-design-accessibility/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Graphic Design Accessibility

## Purpose

Ensure graphic design is accessible to people with disabilities by applying WCAG principles, colorblind-safe palettes, readable typography, and inclusive layout patterns to visual artifacts.

## When to Use

- User asks for accessible design, colorblind-safe palette, or WCAG-compliant graphics
- Designing inclusive infographics, presentations, or print materials
- Auditing existing visuals for accessibility compliance
- Need readable typography or assistive-technology-compatible layouts

## Workflow

1. **Audit design against accessibility criteria** from `references/wcag-criteria.md`
2. **Select accessible color palette** from `references/colorblind-palettes.md`
3. **Define readable typography** from `references/typography-accessibility.md`
4. **Specify alternative text and descriptions** from `references/alt-text.md`
5. **Validate** with `scripts/validate_accessibility.py`
6. **Deliver accessible design specification** with compliance report



## Bundled Resources

- `references/wcag-criteria.md` — WCAG 2.1/2.2 Level AA requirements for visual design
- `references/colorblind-palettes.md` — Colorblind-safe palettes and simulation methods
- `references/typography-accessibility.md` — Readable typography guidelines
- `references/alt-text.md` — Alternative text and ARIA best practices
- `references/inclusive-patterns.md` — Inclusive design patterns for various disabilities
- `assets/accessible-templates/` — HTML templates demonstrating accessible design
- `scripts/validate_accessibility.py` — Automated WCAG compliance checker

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml