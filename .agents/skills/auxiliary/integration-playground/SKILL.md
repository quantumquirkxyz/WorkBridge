---
name: "integration-playground"
category: "auxiliary"
maturity: "stable"
description: "Create a disposable fixture environment for safely exercising Skills against local APIs, data, and files; use when testing a Skill with isolated local fixtures."
version: "1"
capabilities: ""
inputs: ""
outputs: ""
dependencies: ""
sideEffects: ""
stopCondition: "The command ran in the disposable fixture directory and its exit status and output are recorded."
risk: "low"
trustTier: "2"
promptVersion: "2.0"
artifactType: "auxiliary"
modelTier: "fast"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/integration-playground.json"
diataxis: "how-to"
tags: ["auxiliary"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: JSON fixture definition, an optional executable plus argument array, and a temporary output directory.
- Output: disposable playground directory; when a command is supplied, its exit status, stdout, stderr, and command evidence.
- Scope: output must be under the system temporary directory; only Node.js commands run with a minimal environment and commands never pass through a shell.
- Rule: output must be under the system temporary directory; only Node.js commands run with a minimal environment and commands never pass through a shell.
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

Emit `IntegrationPlaygroundArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/integration-playground/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Integration Playground


## Rules

- Rule: create playgrounds only in disposable temporary directories.
- Rule: keep commands shell-free and pass arguments as arrays.
- Rule: never include secrets, production data, or broad filesystem targets in fixtures.
- Rule: preserve command, exit status, stdout, stderr, and fixture definition as evidence.

## Steps

1. Define the fixture data and the command to exercise.
2. Create the isolated playground under a temporary output path.
3. Run the command with the minimal environment required.
4. Record stdout, stderr, exit status, and generated files.
5. Summarize what the playground proved and what it did not prove.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml