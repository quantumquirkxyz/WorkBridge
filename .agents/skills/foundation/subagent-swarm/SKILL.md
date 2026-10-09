---
name: "subagent-swarm"
category: "foundation"
maturity: "stable"
description: "Coordinate multiple agent sub-roles (architect, implementer, reviewer, tester) in parallel or sequential swarm mode, with clear handoff contracts and evidence recording."
version: "1"
capabilities: ""
inputs: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "All roles completed with valid evidence, conflicts resolved, and merged output validated."
risk: "medium"
trustTier: "3"
maxIterations: "3"
promptVersion: "2.0"
artifactType: "agent"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/subagent-swarm.json"
diataxis: "how-to"
tags: ["foundation"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: swarm mode, roles, task spec, handoff contract
- Output: swarm plan, subagent evidence, merged output, conflict resolution
- Scope: does not replace individual skills; orchestrates them with roles
- Rule: does not replace individual skills; orchestrates them with roles
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

Emit `SubagentSwarmArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/subagent-swarm/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Subagent Swarm


## Process
1. Define roles and mode (parallel/sequential).
2. Create swarm plan with task assignments.
3. Execute roles (parallel or sequential).
4. Collect evidence from each role.
5. Resolve conflicts (if any).
6. Merge outputs with evidence.
7. Validate final output against handoff contract.

## Guardrails
- Each subagent must record evidence independently.
- Conflicts must be resolved with explicit reasoning.
- Never merge outputs without validating evidence.
- Preserve context between role handoffs.
- Rule: Assign one owner for final integration even when work is parallelized.
- Rule: Do not let a subagent operate outside its declared role boundary without an explicit handoff.
- Rule: If outputs conflict, preserve both claims and the evidence used to choose between them.
- Rule: Stop the swarm when validation evidence is missing for a required role instead of fabricating completion.

## Contracts Per Role

### architect
- Input: spec/task description
- Output: architecture proposal, module boundaries, dependency map
- Boundary: proposes changes; does not implement code

### implementer
- Input: architecture proposal + task spec
- Output: code changes, tests, validation evidence
- Boundary: writes within sandbox/target; preserves conventions

### reviewer
- Input: implementation + evidence
- Output: review findings (standards/spec), repair plan if needed, clean evidence
- Boundary: read-only analysis of code and evidence; proposes fixes; does not merge

### tester
- Input: implementation + test assertions
- Output: test suite, coverage report, execution log
- Boundary: does not modify source beyond fixtures; surfaces failures with evidence

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml