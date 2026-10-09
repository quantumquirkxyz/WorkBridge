---
name: "graphic-design-photo-direction"
description: "Direct photography and image retouching — art direction, lighting, composition, color grading, and post-production workflows for brand and product imagery."
promptVersion: "2.0"
artifactType: "plan"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/graphic-design-photo-direction.json"
diataxis: "how-to"
tags: ["graphic-design"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: visual concept brief, brand guidelines, product or subject details, and technical constraints.
- Output: shot list, lighting and composition specs, and post-production retouching workflow.
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

Emit `GraphicDesignPhotoDirectionArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/graphic-design-photo-direction/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Graphic Design Photo Direction

## Purpose

Provide art direction for photography shoots and define post-production retouching workflows. This skill guides the creation of brand-aligned visual content through disciplined photography direction and professional retouching pipelines.

## When to Use

Use this skill when the user asks for:
- Photo direction or photography brief
- Product photography
- Image retouching or color grading
- Post-production workflows
- Visual content creation for campaigns or brand assets
- Lighting and composition guidance for shoots


## Workflow

1. **Define visual concept and brand alignment** from `references/brand-alignment.md`
2. **Specify lighting and composition** from `references/lighting-composition.md`
3. **Define color grading approach** from `references/color-grading.md`
4. **Specify retouching workflow** from `references/retouching-workflow.md`
5. **Deliver shot list + post-production specs**

## Bundled Resources

### references/
- `brand-alignment.md` — Translating brand identity into visual content, mood boards, emotional direction, and rights considerations
- `lighting-composition.md` — Lighting setups, product photography lighting, composition rules, camera angles, and background selection
- `color-grading.md` — Color theory, grading styles, LUTs and presets, skin tone preservation, and brand color matching
- `retouching-workflow.md` — Non-destructive editing, frequency separation, dodge and burn, background removal, sharpening, and output resolution

### assets/photo-templates/
- `product-shot-brief.md` — Markdown template for product photography briefs
- `retouching-checklist.md` — Markdown checklist for retouching workflows

### scripts/
- `validate_image.py` — Validates resolution, color mode, format, and file size against print or web requirements

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml