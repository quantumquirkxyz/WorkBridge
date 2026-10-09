---
name: "docs-technical-writing"
category: "docs"
maturity: "stable"
version: "1"
description: "Write technical documentation — clear explanations, examples, warnings, and procedural guidance — with audience-aware structure and maintenance rules."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "The document is clear for its audience, complete for its scope, and maintainable."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "adr"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/docs-technical-writing.json"
diataxis: "how-to"
tags: ["docs"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: documentation goal, audience, source material, and expected reader task.
- Output: outline, edited document, or review notes with gaps and maintenance concerns.
- Scope: preserve technical accuracy and mark unknowns instead of smoothing over missing facts.
- Rule: preserve technical accuracy and mark unknowns instead of smoothing over missing facts.
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

Emit `DocsTechnicalWritingArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/docs-technical-writing/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# docs-technical-writing

Use this skill when drafting, editing, or restructuring documentation for developers, operators, researchers, or technical stakeholders.


## Rules

- Rule: name the reader and the job they are trying to complete.
- Rule: put prerequisites and danger points before procedural steps that depend on them.
- Rule: use examples that match the actual system, not abstract filler.
- Rule: separate conceptual explanation from step-by-step procedure when both are needed.
- Rule: include maintenance ownership for docs that will drift.

## Steps

1. Identify the audience, context, and reader outcome.
2. Inventory source facts, commands, warnings, and examples.
3. Choose the document shape: tutorial, how-to, reference, explanation, ADR, or runbook.
4. Draft or revise sections in the order the reader needs them.
5. Check for missing prerequisites, ambiguous pronouns, stale commands, and unsupported claims.
6. Add maintenance notes when the document depends on changing systems.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml