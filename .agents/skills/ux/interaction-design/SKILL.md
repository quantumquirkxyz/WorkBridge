---
name: "interaction-design"
category: "ux"
maturity: "stable"
version: "1"
description: "Design user interactions — task flows, screen states, transitions, error states, feedback patterns — so the interface guides users predictably."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Design user interactions complete; artifact saved; completion criteria checked."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "plan"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/interaction-design.json"
diataxis: "how-to"
tags: ["ux"]
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

Emit `InteractionDesignArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/interaction-design/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# interaction-design

Design user interactions — task flows, screen states, transitions, error states, feedback patterns — so the interface guides users predictably.

## Goals
- Map all interaction paths including edge cases
- Provide immediate, visible feedback for every action
- Design graceful error recovery
- Create consistent interaction patterns across the product


## Patterns

| Pattern | Trigger | Feedback |
|---|---|---|
| Optimistic update | User action | Immediate UI change, async confirmation |
| Progressive disclosure | User exploration | Step-by-step information reveal |
| Confirmation dialog | Destructive action | Explicit accept/cancel |
| Inline validation | Form input | Real-time error/success message |
| Skeleton screen | Async load | Layout preview before content |

## Steps

1. **Define the goal** — what is the user trying to accomplish
2. **Map the happy path** — primary interaction sequence
3. **Identify branches** — error states, empty states, alternative flows
4. **Choose patterns** — match interaction patterns to context
5. **Design feedback** — what does the user see at each step
6. **Review** — walk through the interaction as a user

## Rules

- Rule: map happy path, alternatives, errors, empty states, and recovery paths.
- Rule: provide feedback for every user action and async state change.
- Rule: make destructive or irreversible actions deliberate and recoverable where possible.
- Rule: keep state transitions predictable across keyboard, pointer, touch, and assistive technology.
- Rule: validate interactions against realistic user goals, not isolated screens.

## References
- `../ux-research/SKILL.md` — grounding design in research
- `../../frontend/frontend-design/SKILL.md` — visual and interaction system
- `../../accessibility/accessibility/SKILL.md` — inclusive interactions

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml