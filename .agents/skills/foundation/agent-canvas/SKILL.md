---
name: "agent-canvas"
category: "foundation"
maturity: "stable"
description: "Reference skill for agent workspace control — multi-agent session management, workspace persistence, and cross-device continuity, independent of any external framework."
version: "1"
capabilities: ""
inputs: ""
outputs: ""
sideEffects: ""
dependencies: []
stopCondition: "Workspace defined, session has explicit finish line, and state is recorded."
risk: "low"
trustTier: "2"
maxIterations: "3"
promptVersion: "2.0"
artifactType: "agent"
modelTier: "fast"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/agent-canvas.json"
diataxis: "how-to"
tags: ["foundation"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: workspace config, session goals, agent roles
- Output: workspace state, session report, export package
- Scope: manages session metadata and state; does not modify source code
- Rule: manages session metadata and state; does not modify source code
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

Emit `AgentCanvasArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/agent-canvas/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Agent Canvas


## Process
1. Define workspace and session goals.
2. Assign agent roles (architect/implementer/reviewer/tester).
3. Persist session state across turns/devices.
4. Track progress against goals.
5. Export or resume when needed.

## Guardrails
- Always record session goals explicitly.
- Preserve evidence from each role.
- Never lose state when switching devices or closing session.
- Maintain independence from any external framework.
- Rule: Do not store secrets, credentials, or private tokens in workspace state.
- Rule: Mark each state item with source, timestamp, owner, and whether it is durable or temporary.
- Rule: If two agents update the same area, require a handoff note before either agent acts on the merged state.
- Rule: Prefer links to durable artifacts over long copied excerpts unless offline continuity requires the excerpt.

## State Model
- Workspace identity: repository path, branch or target, active issue or goal, and validation commands.
- Agent roster: role, scope, current status, and evidence expected at completion.
- Continuity record: open questions, blockers, decisions made, and next safe action.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml