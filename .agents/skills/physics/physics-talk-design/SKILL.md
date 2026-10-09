---
name: "physics-talk-design"
category: "skill-dev/sandbox"
maturity: "stable"
version: "1"
description: "Design physics talks — seminars, conference presentations, posters, public outreach — with audience-level adjustments, timing, visual conventions, and accessibility."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Source compiled; notes saved; checklist completed."
risk: "low"
trustTier: "1"
maxIterations: "5"
promptVersion: "2.0"
artifactType: "plan"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/physics-talk-design.json"
diataxis: "how-to"
tags: ["physics"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: talk/poster topic, audience, duration / size.
- Output: source + notes + checklist.
- Scope: prepares talk/poster; does not deliver it.
- Rule: prepares talk/poster; does not deliver it.
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

Emit `PhysicsTalkDesignArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/physics-talk-design/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Physics Talk Design

Build a **physics talk or poster** — seminar, conference talk, public outreach — with audience-appropriate depth and visual conventions.

## When to use

- A seminar or conference talk needs slides.
- A poster needs layout, figure arrangement, and colour rules.
- A public talk needs a reduced-depth version.

## Process

### 1. Audience and duration

- **Audience:** specialist / cross-disciplinary / student / public.
- **Duration:** 15 min / 30 min / 50 min / 90 min.
- **Format:** talk / poster / panel / public lecture.

**Completion criterion:** audience and format explicit.

### 2. Structure

Standard talk structure:

- **Hook:** why should this audience care? (1 minute).
- **Context:** what is known; what is missing. (2 minutes).
- **Method / model:** the approach (technical for specialists; conceptual for students). (3–5 minutes).
- **Result:** clear statement with figure. (3–5 minutes).
- **Interpretation:** what does this mean? (2 minutes).
- **Conclusion / take-away:** one sentence. (1 minute).

**Completion criterion:** structure saved; timing targets set.

### 3. Figures and conventions

Physics conventions:

- **Units:** always on axes (e.g. "Energy (eV)").
- **Error bars:** visible and labelled (statistical, systematic).
- **Colour:** distinguishable in grayscale; use pattern or line style for colour-blind readers.
- **Scale:** logarithmic / linear stated; avoid misleading truncation.
- **Reference lines:** dashed for theoretical predictions; solid for data.

**Completion criterion:** all figures comply with conventions; accessibility checklist filled.

### 4. Poster design

- **Layout:** title, abstract, result figure, conclusion, references.
- **Flow:** top-to-bottom, left-to-right; highlight result in centre.
- **Font size:** readable from 1.5 m (min 18pt for body, 36pt for headings).
- **Colour:** consistent theme; avoid red-green only combinations.
- **QR code:** link to paper / data / arXiv.

**Completion criterion:** poster layout saved; readability checked.

### 5. Speaker notes and timing

- **Notes:** key message per slide; common question and answer.
- **Timing:** practice aloud; adjust slides to meet duration.
- **Transitions:** state what the next slide answers.

**Completion criterion:** notes saved for each slide; practice timing recorded.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml