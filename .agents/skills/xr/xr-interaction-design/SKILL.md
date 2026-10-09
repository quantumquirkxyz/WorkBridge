---
name: "xr-interaction-design"
category: "xr"
maturity: "stable"
version: "1"
description: "Design XR interactions — spatial input, comfort, locomotion, hand tracking, and feedback — with clear constraints on immersion and usability."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Spatial input, feedback, comfort constraints, and validation tasks are explicit."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "plan"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/xr-interaction-design.json"
diataxis: "how-to"
tags: ["xr"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: user task, environment, device capabilities, input methods, comfort constraints, and safety considerations.
- Output: XR interaction model with input mappings, feedback, comfort constraints, error recovery, and validation tasks.
- Scope: never trade basic comfort, safety, or task clarity for immersion alone.
- Rule: never trade basic comfort, safety, or task clarity for immersion alone.
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

Emit `XrInteractionDesignArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/xr-interaction-design/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# xr-interaction-design

Use this skill when designing AR/VR/MR interactions involving spatial input, hand tracking, controllers, gaze, locomotion, gestures, haptics, or immersive feedback.


## Rules

- Rule: define the user's posture, physical space, dominant input method, and session length.
- Rule: map every action to input, feedback, cancellation, and recovery behavior.
- Rule: account for fatigue, reach limits, motion sickness, occlusion, and tracking loss.
- Rule: provide multimodal feedback when spatial precision or attention is uncertain.
- Rule: validate interactions in-device with realistic posture and environment.

## Steps

1. Define user task, environment, device, session length, and safety constraints.
2. Choose input model: hands, controllers, gaze, voice, body, anchors, or hybrid.
3. Map actions, states, feedback, errors, and cancellation paths.
4. Analyze comfort, locomotion, reach, fatigue, and tracking-loss risks.
5. Prototype and test the interaction in the target XR context.
6. Document validation results, trade-offs, and iteration criteria.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml