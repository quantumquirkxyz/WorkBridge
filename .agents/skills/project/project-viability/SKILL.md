---
name: "project-viability"
description: "Evaluate whether a project is viable, functional, and scalable by analyzing its codebase against CONTEXT.md and ADRs. Use when the user wants a structured assessment of project health, architectural soundness, and growth boundaries before committing to further work."
capabilities: ""
outputs: ""
sideEffects: ""
dependencies: []
stopCondition: "Pre-flight checks resolved; automated baseline completed; three parallel sub-agents executed; quality gate passed; Viability Assessment saved to .reports/; JSON structured result returned; completion criteria verified; user asked how to proceed."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "pull-request"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/project-viability.json"
diataxis: "how-to"
tags: ["project"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: repository with `CONTEXT.md`, ADRs, source code, and automated baseline.
- Output: one Markdown report under `.reports/` and one JSON artifact under `.reports/`, both with layered findings and a prompt for the user.
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
| What evidence proves it is done? | Completion criteria met, structured result returned, validation passed |
| What risk remains? | Subjective judgment calls, missing context, or external dependency failures


## Artifact

Return `ProjectViabilityArtifact` as structured output in the current response. Do not write local artifact files unless the user explicitly asks for an export.


# 
# 
# Project Viability

Analyze whether the project is viable, functional, and scalable across logic, architecture, technical capacity, team maintainability, and domain growth. Ground every finding in `CONTEXT.md`, the ADRs under `docs/adr/`, and actual code evidence. Complement subjective findings with an automated baseline of objective health signals.

Three parallel sub-agents evaluate each dimension independently so findings do not pollute each other's context. This skill aggregates their outputs into a single Markdown report and a structured JSON artifact.


## Confidence Criteria

Use these criteria when assigning confidence levels to findings:

- **High:** ≥2 independent citations supporting the finding, or 1 citation with automated baseline confirmation.
- **Medium:** 1 citation with no automated confirmation, or 2 weak citations.
- **Low:** No direct citation; finding is an inference from structure or naming alone.

Findings with `Low` confidence must be flagged explicitly and must not drive `Not viable` or `Broken` ratings alone.

## Numeric Scoring

In addition to categorical ratings, assign a numeric score 1–5 per dimension:

- 5 — Excellent, no material concerns
- 4 — Good, minor improvements possible
- 3 — Adequate, at least one material concern
- 2 — Poor, multiple material concerns
- 1 — Critical, project is blocked or fundamentally broken

Numeric scores enable tracking across assessments. Include both categorical rating and numeric score in the executive summary.

## Steps

### 1. Pre-flight check

Before proceeding, verify the following in the repository:

- `CONTEXT.md` exists and is non-empty. If missing, note "Insufficient context" for viability and record the gap.
- `docs/adr/` exists. If missing, note that ADR-grounded evaluation is limited and record the gap.
- `references/evaluation-criteria.md`, `references/report-template.md`, `references/subagent-prompts.md`, and `references/health-baseline.md` exist. If missing, warn and use inline defaults.

Record any gaps in the pre-flight findings. Do not abort the workflow; continue with reduced confidence and mark affected findings accordingly.

### 2. Gather context

Read `CONTEXT.md` and all files under `docs/adr/`. If `CONTEXT-MAP.md` exists, read it and resolve each mapped context. Record the domain vocabulary, stated goals, constraints, and recorded decisions.

### 3. Map the codebase

Identify the project shape: interactive app, batch pipeline, agentic system, library, backend service, or hybrid. Map the top-level structure, entry points, data flow, and external integrations. Note any seams between layers. Record approximate LOC and module count.

### 4. Automated baseline

Run the checks in `references/health-baseline.md`. Record the following objective signals:

- Repository LOC and module count
- Dependency health (outdated, vulnerable, orphaned)
- Test coverage signal (test LOC ratio, CI presence)
- Cross-import signal (import count across module boundaries)
- Configuration drift signal (uncommitted config, IaC changes without ADR)

Pass the baseline results to all sub-agents as part of the shared context.

### 5. Spawn parallel sub-agents

Send a single message with three `Agent` tool calls using the `general-purpose` subagent type. Use the prompt templates in `references/subagent-prompts.md`. Include:

- The shared context gathered in steps 1, 2, 3, and 4.
- The viability brief.
- The functionality brief.
- The scalability brief.

Each sub-agent returns:
- A categorical rating.
- A numeric score (1–5).
- Evidence list with citations.
- Confidence level per finding (High / Medium / Low).
- Risk level per finding (High / Medium / Low) based on Likelihood × Impact.
- Conditions, missing items, or limiting factors as applicable.

### 6. Quality gate

Before aggregating, verify:

- Every finding cites `CONTEXT.md`, an ADR path, or a concrete code location.
- Ratings are internally consistent (e.g., "Not viable" must have at least one blocker).
- No dimension contradicts another without an explicit unresolved conflict noted.
- Confidence levels are assigned to all findings.
- Risk levels are assigned to all findings.
- Numeric scores are consistent with categorical ratings.

If the quality gate fails, iterate on the failing sub-agent output before aggregation. Do not write a report that fails the gate.

### 7. Aggregate findings

Combine the three sub-agent outputs into a single report using the structure in `references/report-template.md`. Preserve each dimension's findings separately; do not merge or rerank across axes.

### 8. Write the report

Write the aggregated findings to `.reports/<YYYYMMDD>-viability.md`. Keep the report under 2000 words. Include:

- Executive summary with the three categorical ratings and three numeric scores.
- Evidence-backed findings per layer with confidence and risk levels.
- Priority matrix (Impact × Effort) for recommendations.
- Validation notes documenting quality gate results.
- Pre-flight gaps, if any.
- Delta section comparing with previous assessment, if one exists.

### 9. Write the JSON artifact

Write the structured JSON artifact to `.reports/<YYYYMMDD>-viability.json`. The artifact must include:

- `repository` and `date`
- `preflight` gaps
- `baseline` signals
- `dimensions` with categorical rating, numeric score, findings, and recommendations per dimension
- `overall` posture and conflict resolution
- `validation` notes
- `delta` from previous assessment, if one exists

### 10. Ask the user what to do

After writing the reports, present the path forward and ask the user to choose:

- Address the top findings via `/implement` or `/codebase-design`.
- Sharpen the project model via `/grill-with-docs` or `/domain-modeling`.
- Revisit ADRs via `/docs-management`.
- Abandon or pause the assessment.

Do not proceed without explicit user direction.

## Resources

### references/evaluation-criteria.md

Read this file when scoring viability, functionality, and scalability. It defines the rating thresholds, evidence requirements, anti-patterns, confidence criteria, numeric scoring, risk matrix, and conflict resolution rules for each dimension.

### references/report-template.md

Use this template when writing the `.reports/<YYYYMMDD>-viability.md` file. It specifies the required sections, wording conventions, validation note format, and JSON artifact schema.

### references/subagent-prompts.md

Use these prompts when spawning the three parallel sub-agents in step 5. Each prompt includes the shared context and a focused brief for one dimension, with an output schema that includes rating, numeric score, confidence, and risk.

### references/health-baseline.md

Read this file before step 4. It defines the automated baseline checks to run, the signals to collect, and how to pass them to sub-agents.

### references/edge-cases.md

Read this file when the repository deviates from the standard shape (missing CONTEXT.md, monorepos, legacy projects, config-only repos, dependency health issues).

### references/integration-points.md

Read this file after writing the report to decide which follow-up skill to recommend. It maps dimension ratings to the most effective next action, considering numeric scores and risk levels.

## Completion

- the skill's completion criteria are explicitly checked
- the structured result is returned and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml