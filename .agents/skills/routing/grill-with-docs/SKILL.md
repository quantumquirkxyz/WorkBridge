---
name: "grill-with-docs"
category: "routing"
maturity: "stable"
version: "1"
description: "A relentless interview to sharpen a plan or design, while creating docs (ADRs and glossary) as we go."
capabilities: ""
outputs: ""
sideEffects:
  - write-docs

dependencies: []
stopCondition: "A relentless interview to sharpen a plan or design, while creating docs (ADRs and glossary) as we go complete; artifact saved; completion criteria checked."
risk: "low"
trustTier: "2"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "adr"
modelTier: "router"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/grill-with-docs.json"
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

Emit `GrillWithDocsArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/grill-with-docs/{identifier}.json`
- Markdown view: same filename with `.md` extension


## 
## 
## Rules

- Rule: ask one question at a time and recommend a concrete answer.
- Rule: capture durable terminology, decisions, and disagreements as documentation candidates.
- Rule: use domain-modeling when names, boundaries, or concepts are unstable.
- Rule: do not write ADRs or glossary entries until the user has confirmed the decision or definition.

## Steps

1. Identify the plan or design to grill and the documentation artifacts likely to emerge.
2. Question assumptions, terms, boundaries, and decision criteria.
3. Convert stable answers into ADR, glossary, or context-pack notes.
4. Keep unresolved disagreements visible instead of documenting them as settled.
5. Summarize the refined plan and docs to create or update.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml