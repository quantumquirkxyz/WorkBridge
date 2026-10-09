---
name: "graphic-design-project-management"
category: "graphic-design"
maturity: "experimental"
version: "1"
description: "Manage graphic design projects — briefs, iterations, reviews, asset handoff, versioning, and delivery — with explicit scope, timelines, and quality gates."
capabilities: ""
outputs: ""
sideEffects: ""
dependencies: []
stopCondition: "Graphic design project management plan complete; scope, timeline, iterations, reviews, and handoff standards explicit."
risk: "low"
trustTier: "2"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "plan"
modelTier: "fast"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/graphic-design-project-management.json"
diataxis: "how-to"
tags: ["graphic-design"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: project brief, stakeholder map, deliverable list, timeline constraints, and quality requirements.
- Output: graphic design project management artifact with project plan, iteration schedule, review gates, and handoff standards.
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

Emit `GraphicDesignProjectManagementArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/graphic-design-project-management/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Graphic Design Project Management

Use this skill when a graphic design project needs explicit scope, timeline, iteration cycles, review gates, and asset handoff standards. It should translate stakeholder expectations into a durable project plan that keeps quality, feedback, and delivery visible.


## Steps

### 1. Define project scope and deliverables

- List deliverables: posters, social graphics, brand assets, packaging, editorial layouts, presentations.
- Define acceptance criteria per deliverable: format, resolution, color space, brand compliance, accessibility.
- Define out-of-scope items explicitly.
- Identify dependencies between deliverables.

**Completion criterion:** scope and deliverables with acceptance criteria saved.

### 2. Plan timeline and milestones

- Define project phases: discovery, concept, refinement, production, delivery.
- Assign estimated durations and milestone dates.
- Identify critical path and buffer time.
- Define dependencies between phases and deliverables.

**Completion criterion:** timeline with milestones and critical path saved.

### 3. Design iteration cycles

- Define iteration structure: number of rounds, feedback format, revision limits.
- Separate internal review from stakeholder review.
- Define feedback window and response time expectations.
- Specify what constitutes a new iteration versus a minor revision.

**Completion criterion:** iteration schedule with feedback rules saved.

### 4. Define review gates and approval workflow

- Define review stages: internal creative review, stakeholder review, brand review, legal review, final approval.
- Assign owner and approver per gate.
- Define approval criteria per gate.
- Define escalation path for blocked approvals.

**Completion criterion:** review gates with owners, approvers, and criteria saved.

### 5. Specify asset handoff standards

- Define required formats per deliverable: source files, exported files, preview files.
- Define naming conventions: project code, deliverable type, version, date.
- Define folder structure and asset organization.
- Define versioning strategy: semantic versioning or date-based versioning.
- Define documentation requirements: readme, font licenses, color values, production notes.

**Completion criterion:** asset handoff standards saved.

### 6. Document quality gates

- Define quality checks per deliverable: brand compliance, accessibility, resolution, color accuracy, spelling.
- Define who performs each check.
- Define pass/fail criteria.
- Define rework process for failed quality gates.

**Completion criterion:** quality gate checklist with owners and criteria saved.

### 7. Plan stakeholder communication

- Define meeting cadence: standup, review, retro.
- Define communication channels: async updates, synchronous reviews.
- Define escalation path for blockers.
- Define retrospective schedule and format.

**Completion criterion:** stakeholder communication plan saved.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml