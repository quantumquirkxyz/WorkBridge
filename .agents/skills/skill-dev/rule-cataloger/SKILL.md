---
name: "rule-cataloger"
category: "skill-dev"
maturity: "stable"
description: "Extract and classify rules across Skills by type, frequency, and application area; use when auditing the repository's shared guidance."
version: "1"
capabilities: ""
inputs: ""
outputs: ""
dependencies: []
sideEffects: []
stopCondition: "Every discovered rule is listed with its source Skill, type, and frequency."
risk: "low"
trustTier: "2"
maxIterations: "3"
promptVersion: "2.0"
artifactType: "skill-dev"
modelTier: "fast"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/rule-cataloger.json"
diataxis: "how-to"
tags: ["skill-dev"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: the canonical Skills directory.
- Output: rules with source Skills, frequency, type, and application area.
- Scope: infer categories conservatively and preserve the raw rule text for review.
- Rule: infer categories conservatively and preserve the raw rule text for review.
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

Emit `RuleCatalogerArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/rule-cataloger/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Rule Cataloger


## Rules

- Rule: preserve raw rule text and source path before normalizing categories.
- Rule: distinguish hard rules, preferences, warnings, and completion criteria.
- Rule: report extractor gaps when rules exist in Markdown but the catalog is empty.
- Rule: group repeated rules by meaning, not only by exact wording.

## Steps

1. Run the rule extraction command against the canonical Skills directory.
2. Compare extractor output against a sample of manually observed `Rule:` lines.
3. Classify rules by type, source domain, and action area.
4. Identify duplicated, conflicting, or under-specified rules.
5. Publish the catalog with caveats about extraction coverage.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml