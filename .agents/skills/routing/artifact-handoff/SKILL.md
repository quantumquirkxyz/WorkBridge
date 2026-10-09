---
name: "artifact-handoff"
category: "routing"
maturity: "stable"
version: "1"
description: "Transfer structured artifacts between Skills and sessions — with explicit provenance and consumer expectations."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Transfer structured artifacts between Skills and sessions complete; structured result returned; completion criteria checked."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "routing"
modelTier: "router"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/artifact-handoff.json"
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
| What evidence proves it is done? | Completion criteria met, structured result returned, validation passed |
| What risk remains? | Subjective judgment calls, missing context, or external dependency failures


## Artifact

Return `ArtifactHandoffArtifact` as structured output in the current response. Do not write local artifact files unless the user explicitly asks for an export.


# 
# 
# Artifact Handoff

Use this skill to move a result from one Skill to another without flattening it into prose.

## Steps

1. Package the artifact with id, type, producer, status, summary, evidence, and consumers.
2. Include the minimal context pointer required by the consumer.
3. Preserve provenance and redaction by default.

## Rules

- Rule: include enough provenance for the consumer to verify the artifact without redoing the full prior session.
- Rule: distinguish artifact content from commentary about the artifact.
- Rule: redact secrets, personal data, and irrelevant private context before handoff.
- Rule: name the intended consumer Skill and the exact next action it should take.
- Rule: include validation status and known caveats when the artifact is partial.

## Completion

- the skill's completion criteria are explicitly checked
- the structured result is returned and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml