---
name: "handoff"
category: "routing"
maturity: "stable"
version: "1"
description: "Compact the current conversation into a handoff document for another agent to pick up — with explicit continuity and ownership notes."
capabilities: ""
outputs: ""
sideEffects:
  - write-temp-file

dependencies: []
stopCondition: "Compact the current conversation into a handoff document for another agent to pick up complete; artifact saved; completion criteria checked."
risk: "low"
trustTier: "2"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "routing"
modelTier: "router"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/handoff.json"
diataxis: "how-to"
tags: ["routing"]
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

Emit `HandoffArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/handoff/{identifier}.json`
- Markdown view: same filename with `.md` extension


## 
## 
## Rules

- Rule: write for a fresh agent with no hidden context.
- Rule: include current objective, completed work, open work, validation, branch/commit state, and blockers.
- Rule: prefer links and paths to duplicating long artifacts.
- Rule: redact secrets and unnecessary personal data.
- Rule: do not mark work complete unless the current objective is actually complete.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml