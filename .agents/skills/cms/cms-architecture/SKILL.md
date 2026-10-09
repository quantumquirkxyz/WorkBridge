---
name: "cms-architecture"
category: "cms"
maturity: "stable"
version: "1"
description: "Design content management systems — content models, editorial workflows, publishing pipelines, localization — with schema evolution and multi-channel delivery."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Design content management systems complete; artifact saved; completion criteria checked."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "cms"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/cms-architecture.json"
diataxis: "how-to"
tags: ["cms"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: skill invocation with the user's request and available context.
- Output: a structured artifact or guidance aligned to the skill's declared outputs.
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

Emit `CmsArchitectureArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/cms-architecture/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# cms-architecture

Design content management systems — content models, editorial workflows, publishing pipelines, localization — with schema evolution and multi-channel delivery.

## Goals
- Define content models that are reusable across channels
- Plan editorial workflows with roles and approval states
- Design multi-language and multi-site architecture
- Ensure content portability and schema versioning


## Content Model Patterns

| Pattern | Use case | Example |
|---|---|---|
| Page | Static, hierarchical | Marketing sites |
| Article | Time-based, rich media | Blogs, news |
| Product | Structured, transactional | E-commerce |
| Component | Reusable, composable | Design systems |
| Taxononomy | Classification | Categories, tags |

## Steps

1. **Audit content** — existing content types, volume, reuse patterns
2. **Define content model** — entities, fields, relationships
3. **Design workflow** — draft → review → approved → published
4. **Plan localization** — language variants, fallback, RTL
5. **Choose CMS architecture** — headless (API), coupled, hybrid
6. **Design delivery API** — query, filter, personalize
7. **Plan migration** — content mapping, transformation scripts

## Rules

- Rule: model content for reuse and governance before page rendering.
- Rule: keep editorial workflow, access control, and publishing pipeline explicit.
- Rule: plan schema evolution and migration paths before locking field names.
- Rule: include localization, preview, rollback, and scheduled publishing needs when relevant.
- Rule: define API delivery contracts separately from authoring UI behavior.

## References
- `../backend/backend-architecture/SKILL.md` — API design
- `../../frontend/frontend-design/SKILL.md` — content rendering
- `../../data/data-etl-pipeline/SKILL.md` — content migration

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml