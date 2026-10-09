---
name: "skill-diff-analyzer"
category: "skill-dev"
maturity: "stable"
version: "1"
description: "Compare Skill versions and explain contract, dependency, and behavior impact — use when assessing changes between two Skills."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Compare Skill versions and explain contract, dependency, and behavior impact complete; artifact saved; completion criteria checked."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "skill-dev"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/skill-diff-analyzer.json"
diataxis: "how-to"
tags: ["skill-dev"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: two readable `SKILL.md` files.
- Output: frontmatter changes, content additions/removals, dependency impact, and review recommendation.
- Scope: compare files without editing either version.
- Rule: compare files without editing either version.
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

Emit `SkillDiffAnalyzerArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/skill-diff-analyzer/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Skill Diff Analyzer


## Rules

- Rule: compare frontmatter, contract, rules, steps, references, and side-effect policy separately.
- Rule: treat risk, trust tier, dependencies, outputs, and stop condition changes as behavior changes.
- Rule: distinguish editorial expansion from routing or execution drift.
- Rule: recommend review when a change broadens authority or changes external side effects.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml