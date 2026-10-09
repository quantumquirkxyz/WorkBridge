---
name: "skill-creator"
category: "skill-dev"
maturity: "stable"
version: "4"
description: "Interactive interview and collaborative design tool that helps users define, research, name, generate, and validate complete Codex skills with SKILL.md, scripts, references, assets, ADRs, and traceability."
capabilities: ""
outputs: ""
sideEffects:
  - write-files
dependencies: []
stopCondition: "The user has completed the interview and generated a valid skill structure, or an existing skill has been validated with the supported tooling."
risk: "medium"
trustTier: "3"
maxIterations: "10"
promptVersion: "2.0"
artifactType: "skill-dev"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/skill-creator.json"
diataxis: "how-to"
tags: ["skill-dev"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: skill invocation with the user's request and available context.
- Output: a structured artifact or guidance aligned to the skill's declared outputs.
- Scope: stay within the skill's declared boundaries; do not broaden without explicit direction.
- Rule: follow the skill's completion criteria and stop condition exactly.
- Rule: generated or modified skill files require an explicit user request or prior workflow approval before writing to the repository.

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

Emit `SkillCreatorArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/skill-creator/{identifier}.json`
- Markdown view: same filename with `.md` extension


## 
## 
## Operational Contract

- **Input:** Skill creation request, user interview answers, optional interview JSON, and validation parameters.
- **Output:** Generated skill structure, interview trace, and validation results.
- **Side effects:** Follow the frontmatter declaration. Do not expand scope without explicit user direction.
- **Dependencies:** Use only the declared dependencies, referenced skills, scripts, and source material required by the task.
- **Stop condition:** The requested skill exists, is traceable to the interview or worksheet process, and has passed the selected validation checks.
- **Risk:** Treat generated files as medium-risk repository writes and call out any escalation.
- **Boundary:** Stay within this skill's stated scope, trust tier, and side-effect policy.

# Skill Creator

Use this skill when the user wants to create or update a Codex skill, especially when they need help turning a rough idea into a complete, reviewable skill directory. The current flow supports an interactive interview, a non-interactive script mode, and a legacy worksheet-style process.

## Modes

- **Interactive interview:** Use when the user wants guided discovery and collaborative design.
- **Traditional worksheet flow:** Use when the user already has structured notes or prefers to work through a written design process.
- **Non-interactive script mode:** Use for automation, CI checks, or deterministic smoke tests.
- **Validation-only mode:** Use when a skill already exists and the task is to check structure, traceability, and quality gates.

## Interactive Interview Flow

The interview has five phases:

1. **Discovery:** Clarify the problem, user scenarios, domain, inputs, outputs, related skills, and required expertise.
2. **Collaborative design:** Propose architecture, supporting resources, and workflow. Capture user feedback before generation.
3. **Assisted research:** Gather lightweight best-practice signals and compare nearby skill patterns when useful.
4. **Naming:** Suggest 3-5 skill names from keywords and category, then validate the selected name.
5. **Generation:** Create `SKILL.md`, `scripts/`, `references/`, `assets/`, `adrs/`, and an interview trace.

## Script Usage

### `scripts/interview_skill.py`

Runs the guided interview and generates a skill:

```bash
python scripts/interview_skill.py
python scripts/interview_skill.py --non-interactive --output-dir ./skills
python scripts/interview_skill.py --demo --output-dir ./tmp/demo-skills
```

### `scripts/init_skill.py`

Creates a skill from scratch or from saved interview results:

```bash
python scripts/init_skill.py my-new-skill
python scripts/init_skill.py my-new-skill --output-dir ./skills
python scripts/init_skill.py my-new-skill --from-interview ./my-new-skill-interview.json
```

### `scripts/package_skill.py`

Validates skill structure and quality checks:

```bash
python scripts/package_skill.py ./skills/my-new-skill
python scripts/package_skill.py ./skills/my-new-skill --verbose
python scripts/package_skill.py ./skills/my-new-skill --no-interview-check --no-adr-check
```

### `scripts/research_helpers.py`

Provides reusable helper commands:

```bash
python scripts/research_helpers.py suggest-name api versioning --category integrations
python scripts/research_helpers.py analyze-skills .agents/skills
python scripts/research_helpers.py validate-name api-versioning
```

## Generated Structure

New skills should use this baseline structure unless the task clearly requires more:

```text
<skill-name>/
|-- SKILL.md
|-- scripts/
|   `-- main.py
|-- references/
|   `-- domain.md
|-- assets/
|   `-- README.md
|-- adrs/
|   `-- 0001-initial-design.md
`-- <skill-name>-interview.json
```

## Skill Body Requirements

Generated `SKILL.md` files should include:

- Frontmatter with canonical keys: `name`, `category`, `maturity`, `version`, `description`, `capabilities`, `outputs`, `sideEffects`, `dependencies`, `stopCondition`, `risk`, `trustTier`, and `maxIterations`.
- An operational contract covering input, output, side effects, dependencies, stop condition, risk, and boundaries.
- Clear usage guidance with examples.
- Completion criteria that can be checked by a reviewer or validation script.
- A **How This Skill Was Created** section that records whether the skill came from interview results, worksheets, or manual design.

## Quality Gate

Before handing off a generated or updated skill:

1. Run `python scripts/package_skill.py <skill-dir>`.
2. Confirm the name is lowercase kebab-case and does not duplicate an existing skill.
3. Confirm generated files are in English and do not contain placeholder text.
4. Confirm side effects, risk, and trust tier match the actual behavior.
5. Confirm `scripts/`, `references/`, `assets/`, and `adrs/` are present when the skill contract references them.
6. Preserve a trace from requirements to generated files through the interview JSON or the **How This Skill Was Created** section.

## How This Skill Was Created

This skill was updated from an earlier worksheet-style guide into an interactive interview flow. The redesign is documented in `adrs/0001-interactive-interview-redesign.md`, the source interview trace is stored in `skill-creator-interview.json`, and validation is supported by `scenarios/basic-routing.json` plus `behavioral-fixtures/generated-skill-output.md`.

## Design Principles

- Prefer small focused skills over broad multipurpose skills.
- Make the operational contract explicit.
- Add supporting scripts only when they reduce real ambiguity or repeated work.
- Keep references concise and directly relevant.
- Validate behavior before reporting completion.
- Preserve backward compatibility for existing `init_skill.py` and `package_skill.py` usage.

## References

- `references/skill_design_principles.md` for detailed skill design guidance.
- `scripts/README.md` for the repository script map.
- `assets/README.md` for static asset conventions.
- `templates/interview_questions.yaml` for interview prompts.
- `templates/proposal_templates.yaml` for design proposal patterns.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml
