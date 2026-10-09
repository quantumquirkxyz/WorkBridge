---
name: "skill-sandbox"
category: "skill-dev"
maturity: "stable"
version: "1"
description: "Create, test, and iterate on experimental skills in an isolated environment without affecting the canonical skills bundle."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Create, test, and iterate on experimental skills in an isolated environment without affecting the canonical skills bundle complete; artifact saved; completion criteria checked."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "skill-dev"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/skill-sandbox.json"
diataxis: "how-to"
tags: ["skill-dev"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: skill concept, desired capabilities, test scenarios, and validation criteria
- Output: experimental skill directory, test results, validation report, and promotion recommendation
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

Emit `SkillSandboxArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/skill-sandbox/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Skill Sandbox

Use this skill to safely experiment with creating new skills or modifying existing ones without risking the integrity of the canonical skills bundle.


## Process

### 1. Initialize Sandbox Environment

Create an isolated workspace for skill experimentation:
- Create directory `.skill-sandbox/<skill-name>/` for the experimental skill
- Set up the basic skill structure with SKILL.md file
- Initialize with templates from `skill-creator` and `writing-great-skills`
- Configure local validation that points to sandbox copies of validation scripts

### 2. Develop Experimental Skill

Iteratively build the skill following these principles:
- Start with a clear concept and defined capabilities
- Use `skill-creator` to generate the initial SKILL.md structure
- Apply `writing-great-skills` principles for clarity and predictability
- Define explicit inputs, outputs, dependencies, and side effects
- Create test scenarios that validate expected behavior
- Document the skill following the established style guide

### 3. Test in Isolation

Validate the experimental skill without affecting the main bundle:
- Run `evaluate-skill` against the experimental skill using sandboxed scenario fixtures
- Execute `validate-skills.mjs` and `audit-semantics.mjs` on the sandbox skill only
- Check for proper declaration of capabilities, inputs, outputs, and sideEffects
- Verify that the skill follows the stopCondition and risk assessment guidelines
- Test that the skill produces expected artifacts when given sample inputs

### 4. Validate Against Standards

Ensure the experimental skill meets quality benchmarks:
- Compare against similar canonical skills for consistency
- Verify proper use of quirk vocabulary from CONTEXT.md and quirk-method.md
- Check that artifact templates (if any) follow established patterns
- Confirm that dependencies are correctly declared and resolvable
- Validate that the skill manifest conforms to the platform schema

### 5. Make Promotion Decision

Determine if the skill is ready for the canonical bundle:
- If skill addresses a repeatedly useful behavior not covered by existing skills
- If skill has clear boundaries and doesn't overlap significantly with existing skills
- If skill passes all validation checks with no warnings or errors
- If skill includes proper documentation and examples
- If skill follows the principle of progressive disclosure

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml