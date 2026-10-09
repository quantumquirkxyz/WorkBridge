---
name: "xr-development"
category: "xr"
maturity: "stable"
version: "1"
description: "Design and build extended reality (AR/VR/MR) experiences — 3D interaction, spatial computing, headset development, immersive UX — with performance, comfort, and accessibility as first-class concerns."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Design and build extended reality (AR/VR/MR) experiences complete; artifact saved; completion criteria checked."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "xr"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/xr-development.json"
diataxis: "how-to"
tags: ["xr"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: skill invocation with the user's request and available context.
- Output: a structured artifact or guidance aligned to the skill's declared outputs.
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

Emit `XrDevelopmentArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/xr-development/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# xr-development

Design and build extended reality (AR/VR/MR) experiences — 3D interaction, spatial computing, headset development, immersive UX — with performance, comfort, and accessibility as first-class concerns.

## Goals
- Design immersive 3D interfaces that are comfortable and safe
- Choose the right XR paradigm (pass-through AR, VR, MR)
- Plan for performance (frame rate, latency, power)
- Design for accessibility and inclusive XR


## Paradigms

| Paradigm | Environment | Key challenges | Devices |
|---|---|---|---|
| VR | Fully synthetic | Presence, comfort, locomotion | Quest, Vive, PSVR |
| AR | Real + overlay | Occlusion, registration, FOV | HoloLens, ARKit, ARCore |
| MR | Anchored to world | Spatial anchors, persistence | Magic Leap |

## 3D Interaction Model

| Input | Best for | Trade-offs |
|---|---|---|
| Gaze + dwell | Hands-free, accessibility | Slow, imprecise |
| Controller | Precise, haptic feedback | Learn curve, physical fatigue |
| Hand tracking | Natural, no controller | Occlusion, tracking loss |
| Eye tracking | Foveated rendering, input | Calibration, privacy |

## Performance Targets

| Metric | Target | Why |
|---|---|---|
| Frame rate | 72–120 FPS (VR), 30+ FPS (AR) | Comfort, presence |
| Motion-to-photon latency | <20 ms | Avoid motion sickness |
| Power budget | 5–15 W | Thermal, battery |

## Steps

1. **Choose paradigm** — VR, AR, or MR based on use case
2. **Select target device(s)** — SDK (Unity, Unreal, WebXR, native)
3. **Design 3D interaction** — how users see, move, and act
4. **Plan spatial UX** — comfort, safe areas, locomotion
5. **Optimize performance** — foveated rendering, level of detail
6. **Test for comfort** — locomotion sickness, FOV, ergonomics
7. **Add accessibility** — subtitle, audio cues, seated mode

## References
- `../../ux/ux-research/SKILL.md` — user research for XR
- `../../ux/interaction-design/SKILL.md` — interaction patterns
- `../../accessibility/accessibility/SKILL.md` — inclusive XR

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml