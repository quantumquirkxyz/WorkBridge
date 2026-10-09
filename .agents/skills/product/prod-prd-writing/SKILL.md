---
name: "prod-prd-writing"
category: "product"
maturity: "stable"
version: "1"
description: "Write Product Requirement Documents (PRDs) — problem statement, goals, user stories, acceptance criteria, success metrics, timeline — with stakeholder alignment."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "PRD saved; stakeholder alignment noted; metrics defined."
risk: "low"
trustTier: "1"
maxIterations: "5"
promptVersion: "2.0"
artifactType: "pull-request"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/prod-prd-writing.json"
diataxis: "how-to"
tags: ["product"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: product idea, user feedback, business problem, stakeholder input.
- Output: PRD with problem, goals, user stories, acceptance criteria, metrics, timeline.
- Scope: writes PRD; does not make product decisions unilaterally.
- Rule: writes PRD; does not make product decisions unilaterally.
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

Emit `ProdPrdWritingArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/prod-prd-writing/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Product Requirements Document

Turn a **product idea** into a structured PRD with aligned goals, measurable outcomes, and clear scope.

## Process

### 1. Problem statement
- What problem does this solve for users?
- Who is affected? (user segment)
- How is it solved today? (workaround, competitor, manual process)
- What is the cost of not solving?

**Completion criterion:** problem clear; user segment defined.

### 2. Goals
- **Business goal:** revenue, retention, efficiency, market position.
- **User goal:** task completed faster / easier / with less error.
- **Technical goal:** system reliability, performance, maintainability.
- **Measurable:** each goal has a metric and target.

**Completion criterion:** goals with metrics saved.

### 3. User stories
For each user journey: "As a [user type], I want [action] so that [benefit]."
- Acceptance criteria per story: given / when / then; conditions for pass.
- Priority: must-have / should-have / nice-to-have.

**Completion criterion:** stories with acceptance criteria saved.

### 4. Success metrics
- **Leading** (predictive): feature adoption rate, time-to-first-value, error rate.
- **Lagging** (outcome): revenue impact, retention, NPS, customer satisfaction.
- **Dashboard:** how will metrics be tracked (analytics tool, telemetry, survey)?

**Completion criterion:** metrics table saved.

### 5. Constraints and risks
- Technical: dependencies, performance, security.
- Regulatory: compliance (GDPR, accessibility, financial regulations).
- Timeline: dependencies, holidays, team availability.
- Risk mitigation per item.

**Completion criterion:** risks with mitigation saved.

### 6. Timeline and milestone
- Milestones with dates and deliverables.
- Dependencies between milestones.
- Review points (design review, user testing, release readiness).

**Completion criterion:** timeline saved with milestones.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml