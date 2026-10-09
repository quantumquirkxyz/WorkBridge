---
name: "knowledge-curator"
category: "routing"
maturity: "stable"
version: "1"
description: "Keep context, ADRs, registry entries, and research coherent over time — with refresh and provenance discipline."
capabilities: ""
outputs: ""
sideEffects:
  - write-docs

dependencies: []
stopCondition: "Keep context, ADRs, registry entries, and research coherent over time complete; artifact saved; completion criteria checked."
risk: "low"
trustTier: "2"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "routing"
modelTier: "router"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/knowledge-curator.json"
diataxis: "how-to"
tags: ["routing"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: candidate updates, existing context, and ADRs.
- Output: the minimal durable update that preserves consistency.
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

Emit `KnowledgeCuratorArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/knowledge-curator/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Knowledge Curator

Use this skill to curate durable knowledge after a run.


## Steps

1. Compare candidate updates against existing context and ADRs.
2. Resolve contradictions or mark them for review.
3. Write only the minimal durable update needed.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml