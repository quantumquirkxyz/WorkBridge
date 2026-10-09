---
name: "skill-audit"
category: "skill-dev"
maturity: "stable"
version: "1"
description: "Audit the Skills bundle, lockfile, symlink parity, and contract drift — with actionable maintenance output."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Audit the Skills bundle, lockfile, symlink parity, and contract drift complete; artifact saved; completion criteria checked."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "skill-dev"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/skill-audit.json"
diataxis: "how-to"
tags: ["skill-dev"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: the local Skills bundle, lockfile, symlink tree, and platform schemas.
- Output: a concise audit report with warnings and errors ranked by impact.
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

Emit `SkillAuditArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/skill-audit/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Skill Audit

Use this skill to verify the repository-local Skills platform.


## Steps

1. Run the platform validator in `.agents/skills/platform/validate-skills.mjs`.
2. Run the semantic auditor in `.agents/skills/platform/audit-semantics.mjs` when the audit includes templates, retired names, Markdown links, or contract drift.
3. Inspect the output for missing canonical skills, broken `.claude/` links, and lockfile drift.
4. Inspect the inventory for stale aliases or mismatched metadata that the validator may not classify crisply.
5. Summarize findings as a prioritized maintenance report.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml