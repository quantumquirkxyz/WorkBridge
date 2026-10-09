---
name: "cms-content-strategy"
category: "cms"
maturity: "stable"
version: "1"
description: "Design CMS content strategy — content models, taxonomy, governance, lifecycle, and multi-channel publishing — with explicit editorial ownership."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Content model, governance, lifecycle, and publishing rules are explicit."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "cms"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/cms-content-strategy.json"
diataxis: "how-to"
tags: ["cms"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: business goals, content inventory, audiences, editorial roles, channels, and localization or compliance needs.
- Output: content model, taxonomy, ownership, workflow, lifecycle, and publishing guidance.
- Scope: model content around editorial intent and reuse, not around a single page layout.
- Rule: model content around editorial intent and reuse, not around a single page layout.
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

Emit `CmsContentStrategyArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/cms-content-strategy/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# cms-content-strategy

Use this skill when designing CMS content models, editorial workflows, taxonomies, governance, content lifecycle, or publishing rules across channels.


## Rules

- Rule: define content types by purpose, owner, lifecycle, and reusable fields.
- Rule: separate taxonomy, navigation, search facets, and editorial labels.
- Rule: include governance for creation, review, publishing, archival, and deletion.
- Rule: identify channel-specific transformations without duplicating canonical content unnecessarily.
- Rule: account for localization, legal review, accessibility, and freshness where relevant.

## Steps

1. Inventory content, audiences, channels, and editorial pain points.
2. Define canonical content types, fields, relationships, and validation rules.
3. Design taxonomy and metadata for discovery, reuse, and governance.
4. Map editorial workflow, ownership, review gates, and lifecycle states.
5. Specify channel, localization, and archival behavior.
6. Document migration and maintenance considerations.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml