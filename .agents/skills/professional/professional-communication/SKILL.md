---
name: "professional-communication"
category: "professional"
maturity: "stable"
version: "1"
description: "Improve professional communication — status updates, stakeholder messages, expectations, and escalation — with clarity and precision."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "The message has a clear audience, ask, status, tone, and next step."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "pull-request"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/professional-communication.json"
diataxis: "how-to"
tags: ["professional"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: audience, context, desired outcome, constraints, and any facts that must be included.
- Output: polished message or critique with intent, tone, and next action.
- Scope: do not invent facts, commitments, or authority the sender does not have.
- Rule: do not invent facts, commitments, or authority the sender does not have.
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

Emit `ProfessionalCommunicationArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/professional-communication/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# professional-communication

Use this skill when writing or reviewing status updates, stakeholder messages, escalation notes, expectation resets, decision requests, or sensitive professional communication.


## Rules

- Rule: identify the audience and the decision or action needed from them.
- Rule: separate facts, interpretation, risks, and requests.
- Rule: match urgency to evidence; do not escalate with vague concern alone.
- Rule: make ownership and next steps visible.
- Rule: preserve accountability without unnecessary self-blame or blame shifting.

## Steps

1. Clarify recipient, relationship, stakes, and desired outcome.
2. Extract the facts that must be said and the facts that should be omitted.
3. Choose message shape: update, ask, escalation, apology, handoff, or decision memo.
4. Draft with the core point early and supporting detail after it.
5. Tune tone for directness, warmth, urgency, and risk.
6. Check that the message ends with a clear next step.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml