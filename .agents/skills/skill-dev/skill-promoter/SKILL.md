---
name: "skill-promoter"
category: "skill-dev"
maturity: "stable"
version: "1"
description: "Promote validated experimental skills from the sandbox to the canonical skills bundle."
capabilities: ""
outputs: ""
sideEffects:
  - write-files
  - create-symlink
  - update-lockfile

dependencies: []
stopCondition: "Promote validated experimental skills from the sandbox to the canonical skills bundle complete; artifact saved; completion criteria checked."
risk: "medium"
trustTier: "3"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "pull-request"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/skill-promoter.json"
diataxis: "how-to"
tags: ["skill-dev"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: skill name, validation report, and promotion criteria
- Output: promoted skill in canonical bundle, updated symlinks, updated lockfile, and promotion report
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

Emit `SkillPromoterArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/skill-promoter/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Skill Promoter

Use this skill to promote validated experimental skills from the sandbox to the canonical skills bundle.


## Process

### 1. Validate Sandbox Skill

Before promotion, ensure the skill is ready:
- Run validation scripts on the sandbox skill
- Check for any warnings or errors in the validation report
- Verify that the skill follows the skill-style-guide
- Confirm that the skill has clear boundaries and distinct capabilities
- Ensure the skill includes proper documentation and examples

### 2. Prepare for Promotion

Get the skill ready for the canonical bundle:
- Create the skill directory in .agents/skills/
- Copy the SKILL.md and any associated files (references/, scripts/)
- Ensure the skill follows the exact structure expected by canonical skills
- Verify that dependencies are correctly declared and resolvable in the main bundle

### 3. Update Canonical Bundle

Move the skill to its permanent location:
- Copy the skill directory to .agents/skills/<skill-name>/
- Create the symlink in .claude/skills/<skill-name> pointing to ../../.agents/skills/<skill-name>
- Update skills-lock.json with the skill's information and hash
- Run the full validation suite (check-all.mjs) to ensure nothing is broken

### 4. Record Provenance

Document the skill's journey:
- Add an entry to docs/agents/provenance.md documenting the promotion
- Include the skill name, promotion date, and rationale
- Note any influences from the sandbox experimentation phase
- Update the skills-map.md if the skill represents a new category

### 5. Verify Promotion

Confirm the promotion was successful:
- Run check-all.mjs to ensure the bundle is still valid
- Verify that the skill can be invoked and functions correctly
- Check that the .claude/skills/ symlink works properly
- Confirm that the skill appears in the skills registry

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml