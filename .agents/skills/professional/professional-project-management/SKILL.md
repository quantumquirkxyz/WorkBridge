---
name: "professional-project-management"
category: "professional"
maturity: "stable"
version: "1"
description: "Manage professional projects — scope, milestones, risks, dependencies, and stakeholder alignment — with explicit planning and tracking artifacts."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Scope, ownership, milestones, risks, and tracking cadence are explicit."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "pull-request"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/professional-project-management.json"
diataxis: "how-to"
tags: ["professional"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: project goal, constraints, stakeholders, deadline, current status, and known work items.
- Output: scope, milestones, ownership, risks, dependencies, and communication cadence.
- Scope: expose uncertainty instead of pretending the plan is more certain than the evidence supports.
- Rule: expose uncertainty instead of pretending the plan is more certain than the evidence supports.
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

Emit `ProfessionalProjectManagementArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/professional-project-management/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# professional-project-management

Use this skill when turning an ambiguous initiative into a project plan, recovering a drifting project, or preparing stakeholder-ready tracking artifacts.


## Rules

- Rule: define what is in scope and out of scope before sequencing work.
- Rule: assign owners to outcomes, not just vague work areas.
- Rule: separate blockers, risks, assumptions, and dependencies.
- Rule: include decision points where stakeholder input is required.
- Rule: keep tracking lightweight enough that it will actually be maintained.

## Steps

1. Clarify project objective, success criteria, deadline, and non-goals.
2. Identify stakeholders, owners, dependencies, and external commitments.
3. Break the work into milestones with exit criteria.
4. List risks, blockers, assumptions, and mitigation options.
5. Define status cadence, escalation path, and decision checkpoints.
6. Produce the plan or tracker in the format the team will use.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml