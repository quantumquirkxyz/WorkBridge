---
name: "execution-policy"
category: "auxiliary"
maturity: "stable"
description: "Decide whether a Skill action is allowed, requires approval, or must stop."
disable-model-invocation: "true"
version: "1"
capabilities: ""
inputs: ""
outputs: ""
dependencies: []
sideEffects: []
stopCondition: "The action is allowed or blocked with reason, approval requirement is clear, and rollback is named."
risk: "low"
trustTier: "1"
promptVersion: "2.0"
artifactType: "auxiliary"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/execution-policy.json"
diataxis: "how-to"
tags: ["auxiliary"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: skill invocation with the user's request and available context.
- Output: a structured artifact or guidance aligned to the skill's declared outputs.
- Scope: stay within the skill's declared boundaries; do not broaden without explicit direction.
- Rule: follow the skill's completion criteria and stop condition exactly.

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

Emit `ExecutionPolicyArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/execution-policy/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Execution Policy

This skill is advisory only. It does not change repository state or perform the action it judges.

Use this skill before any risky state change.

## Steps

1. Classify the requested action as read, write, delete, network, or external write.
2. Check the Skill manifest side effects and approval threshold.
3. Require explicit approval for destructive or irreversible actions.
4. Record the decision and rollback path.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml