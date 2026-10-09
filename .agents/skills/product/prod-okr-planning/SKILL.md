---
name: "prod-okr-planning"
category: "product"
maturity: "stable"
version: "1"
description: "Design OKR cycles — Objectives, Key Results, initiatives — with measurable outcomes, quarterly cadences, and team alignment."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "OKR document saved; initiatives mapped to KRs; progress tracker template ready."
risk: "low"
trustTier: "1"
maxIterations: "4"
promptVersion: "2.0"
artifactType: "plan"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/prod-okr-planning.json"
diataxis: "how-to"
tags: ["product"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: team mission, company OKRs, current quarter / cycle.
- Output: team OKR document + initiative mapping.
- Scope: designs OKRs; does not execute initiatives.
- Rule: designs OKRs; does not execute initiatives.
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

Emit `ProdOkrPlanningArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/prod-okr-planning/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# OKR Planning

Design a **quarterly OKR cycle** — Objectives, Key Results, initiatives — with measurable outcomes and team alignment.

## Process

### 1. Mission alignment
- State the team mission for the quarter.
- Align with company OKRs (copy relevant ones; ignore if not applicable).
- Identify what the team uniquely contributes that no other team can.

**Completion criterion:** mission statement saved.

### 2. Objectives
Rules for a good Objective:
- Ambitious and inspiring (motivates the team).
- Qualitative (not a number).
- Time-bound (one quarter).
- 2–4 Objectives per team per quarter.

**Completion criterion:** 2–4 Objectives saved.

### 3. Key Results
Rules for good Key Results:
- Measurable (has a number and baseline).
- Outcome-oriented (not output — not "we will build X" but "X will improve Y by Z%").
- Achievable (70% success is good — overconfident KRs demoralise teams).
- Relevant (directly supports the Objective).
- Time-bound (achievable within the quarter).

For each Objective: 2–4 Key Results.

**Completion criterion:** KRs saved with baseline and target.

### 4. Initiatives
For each KR: list the initiatives (projects, tasks, experiments) that drive it.
Not every initiative maps to a KR — if an initiative has no KR, question whether it belongs.

**Completion criterion:** initiatives mapped to KRs.

### 5. Progress tracking
Define: how often (weekly / biweekly), who updates, what format (score 0–1.0 per KR), and what to do when off-track (adjust, escalate, drop).

**Completion criterion:** tracker template saved.

### 6. Retro
At end of cycle: score each KR (0.0–1.0); write retrospective: what worked, what didn't, what to carry forward.

**Completion criterion:** retro template saved.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml