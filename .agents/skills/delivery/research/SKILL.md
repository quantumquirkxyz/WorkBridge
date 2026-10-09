---
name: "research"
category: "delivery"
maturity: "stable"
version: "1"
description: "Investigate a question against high-trust primary sources and capture the findings as a Markdown file in the repo. Use w"
capabilities: ""
outputs: ""
sideEffects:
  - write-docs

dependencies: []
stopCondition: "Investigate a question against high-trust primary sources and capture the findings as a Markdown file in the repo complete; artifact saved; completion criteria checked."
risk: "low"
trustTier: "2"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "research"
modelTier: "fast"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/research.json"
diataxis: "how-to"
tags: ["delivery"]
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

Emit `ResearchArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/research/{identifier}.json`
- Markdown view: same filename with `.md` extension


## 
## 
## Rules

- Rule: prefer primary sources and record why any secondary source was used.
- Rule: cite claim-level sources, not just a bibliography at the end.
- Rule: capture publication or access dates when freshness matters.
- Rule: separate confirmed facts, source interpretation, and open questions.
- Rule: preserve enough search/query detail for another agent to reproduce the research path.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml