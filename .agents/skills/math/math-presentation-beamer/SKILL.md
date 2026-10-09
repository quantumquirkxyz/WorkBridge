---
name: "math-presentation-beamer"
category: "skill-dev/sandbox"
maturity: "stable"
version: "1"
description: "Design mathematics presentations — Beamer slides with TikZ diagrams, colour accessibility, speaker notes, and audience-level adjustments — for seminars, conferences, or lectures."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Source compiles; speaker notes saved; accessibility checklist completed; audience-level stated."
risk: "low"
trustTier: "1"
maxIterations: "5"
promptVersion: "2.0"
artifactType: "pull-request"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/math-presentation-beamer.json"
diataxis: "how-to"
tags: ["math"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: talk content (topic, audience, duration), and any figures.
- Output: Beamer source + speaker notes + accessibility checklist.
- Scope: produces presentation artifacts; does not deliver the talk.
- Rule: produces presentation artifacts; does not deliver the talk.
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

Emit `MathPresentationBeamerArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/math-presentation-beamer/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Math Presentation — Beamer and Design

Build a **Beamer presentation** that communicates the mathematics clearly to the audience, with accessible design and speaker-ready notes.

## When to use

- A seminar, conference talk, or lecture needs a structured slide set.
- Figures need to be accurate, consistent, and accessible.
- The speaker wants timing and transition notes.

## Process

### 1. Define the audience and duration

- **Audience level** — general mathematician / specialist / student / public.
- **Duration** — 15 min / 30 min / 50 min / 90 min.
- **Goal** — inform / persuade / teach / review.

**Completion criterion:** audience and goal explicit.

### 2. Structure the slides

- **Title + outline** (first 2 minutes).
- **Motivation / context** (why does this matter to this audience?).
- **Statement / result** (clear, with hypotheses).
- **Proof / construction** (key steps, with citations).
- **Application / consequence** (what changes now?).
- **References / acknowledgements.**

**Completion criterion:** structure saved; each section has a clear purpose.

### 3. Figures and diagrams

- Use TikZ for mathematical figures; keep style consistent.
- Colour: avoid colour-only signalling; use patterns / shapes.
- Font size: readable from the back of the room (min 16pt for body, 20pt for headings).
- Alt-text for each figure (description for screen readers).

**Completion criterion:** all figures have alt-text; colour accessibility checked.

### 4. Speaker notes

For each slide, write:

- **Key message** in 1 sentence.
- **Timing target** (e.g. "2 minutes").
- **Transition cue** ("Next: we show the main theorem...").
- **Common question / answer** (if this slide confuses someone).

**Completion criterion:** notes saved for each slide.

### 5. Compile and check

- Compile the `.tex`; fix errors.
- Print / preview; verify that no content overflows.
- Check timing by reading aloud (target pace: ~2 minutes per major slide).

**Completion criterion:** compiled PDF; timing verified; overflow checked.

## Notes

- Pair with `math-paper-collaboration` for sharing .tex source.
- Use `math-formal-proof` for appendix slides that cite a verified proof.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml