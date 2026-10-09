---
name: "graphic-design-editorial"
description: "Design editorial layouts — magazines, books, reports, long-form content — with explicit grid systems, typography hierarchy, and production-ready pagination."
promptVersion: "2.0"
artifactType: "plan"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/graphic-design-editorial.json"
diataxis: "how-to"
tags: ["graphic-design"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: content type, audience, publication format, and any brand or production constraints.
- Output: paginated layout specification with grid system, typography hierarchy, and image treatment.
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

Emit `GraphicDesignEditorialArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/graphic-design-editorial/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Graphic Design Editorial

## Purpose

Design editorial layouts for print and digital publications. Provide production-ready pagination specifications with explicit grid systems, typographic hierarchy, and image treatment.

## When to Use

Use this skill when the user asks for:
- Editorial design or magazine layout
- Book design or book chapter layout
- Report layout or long-form content design
- Pagination systems or page composition
- Typography hierarchy for publications
- Print production specifications for editorial content


## Workflow

1. Analyze content type and audience
2. Select grid system and layout approach from `references/grid-systems.md`
3. Define typography hierarchy from `references/typography-hierarchy.md`
4. Specify image treatment and captions from `references/image-treatment.md`
5. Define print production specs from `references/print-production.md`
6. Deliver paginated layout specification with rationale

## Resources

### references/
- `grid-systems.md` — Modular grids, grid selection by content type, margins and gutters, digital vs print considerations, intentional grid-breaking
- `typography-hierarchy.md` — Type scales, font pairing, leading/tracking/kerning, drop caps, pull quotes, running headers
- `image-treatment.md` — Image placement, captions, image-to-text ratios, CMYK conversion, accessibility alt text
- `print-production.md` — Page sizes, bleed and safety margins, color modes, resolution requirements, PDF export and preflight

### assets/editorial-templates/
- `magazine-spread.html` — Self-contained HTML/CSS magazine spread demonstrating grid, typography hierarchy, and image placeholders
- `book-chapter.html` — Self-contained HTML/CSS book chapter layout with running headers, footnotes, and drop caps

### scripts/
- `validate_editorial.py` — Validates HTML editorial templates for heading hierarchy, font scale consistency, readable line lengths, image alt attributes, and WCAG AA color contrast

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml