---
name: "context-engine"
category: "foundation"
maturity: "stable"
description: "Manage dynamic context for agent execution using retrieval-augmented generation patterns, updating the working context from sources beyond static CONTEXT.md (issues, PRs, docs, execution traces)."
version: "1"
capabilities: ""
inputs: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Context retrieved, indexed, and answer provided with explicit source attribution."
risk: "low"
trustTier: "2"
maxIterations: "5"
promptVersion: "2.0"
artifactType: "foundation"
modelTier: "fast"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/context-engine.json"
diataxis: "how-to"
tags: ["foundation"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: query and source list
- Output: synthesized context, index, changes, answer with attribution
- Scope: reads only; updates working context; does not modify source files
- Rule: reads only; updates working context; does not modify source files
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

Emit `ContextEngineArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/context-engine/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Context Engine


## Process
1. Parse query and identify relevant sources.
2. Retrieve content from sources (files, issues, PRs, traces).
3. Index and synthesize.
4. Detect changes since last index.
5. Provide answer with source attribution.

## Guardrails
- Always attribute sources.
- Do not fabricate sources.
- Preserve original vocabulary from CONTEXT.md.
- Update index only with verified changes.
- Rule: Prefer primary repository artifacts over summaries when both are available.
- Rule: Record source freshness and whether the answer depends on potentially stale external state.
- Rule: Do not broaden source access beyond the caller's declared boundary without asking.
- Rule: If retrieval fails, return the missing source list instead of guessing.

## Output Shape
- `context-result`: concise synthesis tied to exact source references.
- `context-index`: source identifiers, timestamps, and content scope.
- `context-changes`: additions, removals, or changed facts since the prior retrieval.
- `query-answer`: direct answer plus caveats for missing or conflicting evidence.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml