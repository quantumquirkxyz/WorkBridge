---
name: "graphic-design-motion"
description: "Design motion graphics and UI animations — microinteractions, transitions, Lottie, CSS animations — with explicit timing, easing, choreography, and performance rules."
promptVersion: "2.0"
artifactType: "plan"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/graphic-design-motion.json"
diataxis: "how-to"
tags: ["graphic-design"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: skill invocation with the user's request and available context.
- Output: a structured artifact or guidance aligned to the skill's declared outputs.
- Scope: stay within the skill's declared boundaries; do not broaden without explicit direction.
- Rule: follow the skill's completion criteria and stop condition exactly.

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

Emit `GraphicDesignMotionArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/graphic-design-motion/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Graphic Design Motion

## Purpose

Design motion graphics, UI animations, microinteractions, Lottie animations, and CSS transitions. Apply timing, easing, choreography, and performance budgets so motion feels intentional, accessible, and performant.

## When to Use

Use this skill when the user asks for:
- Animation or motion graphic design
- Lottie animations or Bodymovin exports
- UI microinteractions (button hover, toggle, checkbox, loading states)
- Page or view transitions
- Loading animations, animated icons, skeleton states
- Motion design system guidance (timing, easing, choreography)

## Workflow

1. **Define emotional message and function of motion**
   - Clarify intent (delight, feedback, spatial orientation, attention).
   - Identify trigger, duration target, and accessibility constraints (prefers-reduced-motion).
   - See `references/motion-principles.md` for foundational timing and choreography concepts.

2. **Select pattern and target tool**
   - Choose the animation pattern and implementation tool using `references/gsap-vs-framer-motion.md`.
   - Common choices:
     - **CSS** for lightweight transitions and microinteractions with no-JS fallback.
     - **Lottie** for exported After Effects animations across platforms.
     - **GSAP** for complex timelines, SVG control, and scroll-triggered sequences.
     - **Framer Motion** for React layout animations and gesture-driven interactions.
   - See `references/animation-patterns.md` for UI pattern catalog.

3. **Specify timing, easing, and choreography**
   - Apply Disney animation principles and easing curves from `references/motion-principles.md`.
   - Use `references/css-animation-patterns.md` for keyframes, transitions, View Transitions API, and scroll-driven techniques.
   - Use `references/lottie-spec.md` if exporting from After Effects.

4. **Generate code or prototype**
   - Produce executable assets:
     - Lottie JSON for After Effects exports.
     - CSS/JS for web microinteractions and transitions.
   - Use templates in `assets/motion-templates/` as starting points.

5. **Validate performance**
   - Verify 60fps target and minimal main-thread work.
   - For Lottie, run `scripts/optimize_lottie.py` against the exported JSON.
   - Check file size budgets:
     - UI icons: < 100 KB
     - Illustrations: < 500 KB

6. **Deliver spec + executable assets**
   - Provide timing specs, easing values, trigger conditions, and accessibility notes.
   - Include all generated files and optimization report.

## Bundled Resources

- `references/motion-principles.md` — timing, easing, Disney principles, choreography, performance budgets.
- `references/animation-patterns.md` — UI animation patterns with triggers, durations, easing, and accessibility.
- `references/lottie-spec.md` — Bodymovin export settings, layer rules, optimization, size budgets.
- `references/css-animation-patterns.md` — @keyframes, transitions, View Transitions API, scroll-driven animations.
- `references/gsap-vs-framer-motion.md` — tool selection matrix and trade-offs.
- `assets/motion-templates/` — starter Lottie and CSS animation templates.
- `scripts/optimize_lottie.py` — Lottie size and bloat analysis script.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml