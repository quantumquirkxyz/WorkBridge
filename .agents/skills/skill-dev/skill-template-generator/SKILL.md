---
name: "skill-template-generator"
category: "skill-dev"
maturity: "stable"
version: "1"
description: "Generate an interactive, contract-complete Skill template in the sandbox — use when starting a new Skill with the lab's scaffolding."
capabilities: ""
outputs: ""
sideEffects:
  - write-files

dependencies: []
stopCondition: "Generate an interactive, contract-complete Skill template in the sandbox complete; artifact saved; completion criteria checked."
risk: "low"
trustTier: "2"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "skill-dev"
modelTier: "fast"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/skill-template-generator.json"
diataxis: "how-to"
tags: ["skill-dev"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: skill name, domain, description, and optional capability list.
- Output: a non-overwriting sandbox Skill, completed frontmatter, and validation command.
- Scope: generate only under `.skill-sandbox/`; promotion remains a separate decision.
- Rule: generate only under `.skill-sandbox/`; promotion remains a separate decision.
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

Emit `SkillTemplateGeneratorArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/skill-template-generator/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Skill Template Generator


## Rules

- Rule: generate into `.skill-sandbox/` only.
- Rule: ask for problem, users, capabilities, outputs, dependencies, side effects, and risk before scaffolding.
- Rule: include a concrete stop condition and at least one validation path in the template.
- Rule: never overwrite an existing sandbox Skill without explicit user direction.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml