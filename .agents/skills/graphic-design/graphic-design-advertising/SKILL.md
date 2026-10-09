---
name: "graphic-design-advertising"
description: "Design advertising creatives — social ads, display ads, email banners, campaign visuals — with explicit brand consistency, format specifications, and conversion-focused layout rules."
promptVersion: "2.0"
artifactType: "plan"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/graphic-design-advertising.json"
diataxis: "how-to"
tags: ["graphic-design"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: campaign goals, target audience, brand guidelines, platform specifications, and format requirements.
- Output: creative layout specification with brand-consistent design, copy hierarchy, and platform-compliant dimensions.
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

Emit `GraphicDesignAdvertisingArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/graphic-design-advertising/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Graphic Design Advertising


## Overview

This skill provides a repeatable workflow and reference library for designing advertising creatives across digital and print channels. It ensures every deliverable is sized correctly, on-brand, conversion-focused, and validated against platform specifications.

## Workflow

1. Define campaign goals and target audience from `references/campaign-strategy.md`
2. Select format and dimensions from `references/ad-formats.md`
3. Design creative layout with brand consistency from `references/brand-consistency.md`
4. Specify copy hierarchy and CTA placement from `references/copy-layout.md`
5. Validate against platform specs with `references/platform-specs.md`
6. Deliver campaign creative specs + variations

## Usage

Trigger this skill when the user asks for:
- Ad design
- Social media ad
- Display ad
- Banner
- Campaign creative
- Marketing visual
- Ad creative

## Reference Documentation

Load the appropriate reference files into context before executing the workflow:

- `references/campaign-strategy.md` — campaign objective mapping, audience alignment, A/B variables, success metrics
- `references/ad-formats.md` — dimensions, file size limits, and aspect ratios for every major ad format
- `references/brand-consistency.md` — template systems, color and typography rules, logo placement, voice and tone
- `references/copy-layout.md` — headline hierarchy, body copy length, CTA design, visual flow and eye-tracking
- `references/platform-specs.md` — Meta, Google Ads, LinkedIn, TikTok, and email client specifications

## Assets

- `assets/ad-templates/social-post.html` — Instagram/LinkedIn post template
- `assets/ad-templates/display-ad.html` — 728x90 leaderboard display ad
- `assets/ad-templates/email-banner.html` — Email header banner template

## Scripts

- `scripts/validate_ad.py` — validates HTML ad templates for dimensions, CTA visibility, WCAG AA contrast, logo placement, and file size estimates.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml