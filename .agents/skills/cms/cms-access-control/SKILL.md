---
name: "cms-access-control"
category: "cms"
maturity: "stable"
version: "1"
description: "Design CMS access control — roles, permissions, editorial workflows, and publishing boundaries — with explicit least-privilege and auditability."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Roles, permissions, workflow gates, and audit requirements are explicit."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "cms"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/cms-access-control.json"
diataxis: "how-to"
tags: ["cms"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: editorial roles, content types, workflow states, publishing risk, compliance constraints, and platform capabilities.
- Output: role-permission matrix, workflow gates, audit requirements, and exception handling.
- Scope: keep least privilege practical enough for editors to complete normal work without sharing privileged accounts.
- Rule: keep least privilege practical enough for editors to complete normal work without sharing privileged accounts.
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

Emit `CmsAccessControlArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/cms-access-control/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# cms-access-control

Use this skill when designing or reviewing CMS roles, permissions, approval gates, publishing authority, content ownership, and audit requirements.


## Rules

- Rule: define roles by editorial responsibility, not only by organization chart.
- Rule: separate create, edit, review, approve, publish, archive, delete, and administer permissions.
- Rule: require explicit gates for high-risk publishing surfaces.
- Rule: log privileged actions, workflow transitions, and permission changes.
- Rule: document break-glass or emergency publishing behavior if needed.

## Steps

1. Inventory roles, content types, workflow states, and publishing risks.
2. Build a permission matrix by action and content scope.
3. Define approval gates, segregation of duties, and exceptions.
4. Specify audit logs, review cadence, and permission-change controls.
5. Identify usability risks that could drive unsafe workarounds.
6. Document validation tests for representative roles.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml