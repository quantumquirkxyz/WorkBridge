---
name: "improve-codebase-architecture"
category: "engineering"
maturity: "stable"
description: "Scan a codebase for deepening opportunities and present candidates as a visual HTML report, then grill through the selected one."
version: "1"
capabilities: ""
inputs: ""
outputs: ""
sideEffects: ""
dependencies: []
stopCondition: "Report generated and a candidate is selected or explicitly deferred."
risk: "low"
trustTier: "2"
maxIterations: "3"
promptVersion: "2.0"
artifactType: "pull-request"
modelTier: "fast"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/improve-codebase-architecture.json"
diataxis: "how-to"
tags: ["engineering"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: codebase path and depth threshold
- Output: HTML/JSON report with deepening candidates, plus selected candidate
- Scope: analysis only; no automatic rewrites
- Rule: analysis only; no automatic rewrites
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

Emit `ImproveCodebaseArchitectureArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/improve-codebase-architecture/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Improve Codebase Architecture


## Process
1. Scan the target directory for module structures.
2. Compute depth and dependency metrics.
3. Identify candidates with high complexity or shallow interfaces.
4. Generate HTML/JSON report.
5. Present candidates; user selects one or defers.
6. If selected, initiate a grilling session for the module.

## Guardrails
- Do not rewrite source code.
- Surface all candidates clearly; selection is user-controlled.
- Preserve existing conventions.
- Rule: Skill must include a Contract section with Input, Output, and Boundary.
- Rule: Treat architecture scores as prompts for investigation, not as automatic refactoring orders.
- Rule: Do not recommend a rewrite without naming the narrower seam that failed first.
- Rule: If the scan cannot inspect a language or build graph, mark that evidence gap in the report.
- Rule: When a candidate is selected, hand off to `grill-me` or `codebase-design` before implementation.

## Report Requirements
- Include the files or modules inspected, the heuristic used, and the reason each candidate matters.
- Separate confirmed problems from suspected deepening opportunities.
- Preserve enough evidence for a reviewer to reproduce the candidate list without rerunning the full scan.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml