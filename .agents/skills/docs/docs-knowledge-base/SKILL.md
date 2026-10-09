---
name: "docs-knowledge-base"
category: "docs"
maturity: "stable"
version: "1"
description: "Maintain a repository knowledge base — glossary, durable references, indexed guidance, and consumer-oriented navigation — with explicit update rules."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Knowledge-base entries are findable, scoped, owned, and linked to durable sources."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "adr"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/docs-knowledge-base.json"
diataxis: "how-to"
tags: ["docs"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: existing docs, target audiences, repeated questions, and source-of-truth locations.
- Output: information architecture, index entries, glossary rules, and maintenance plan.
- Scope: link to source material rather than duplicating details that will drift quickly.
- Rule: link to source material rather than duplicating details that will drift quickly.
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

Emit `DocsKnowledgeBaseArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/docs-knowledge-base/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# docs-knowledge-base

Use this skill when building or maintaining a repository knowledge base, glossary, handbook, or indexed guidance set that multiple agents or contributors rely on.


## Rules

- Rule: define the consumer of each knowledge-base entry.
- Rule: prefer durable references over copied snapshots when the source changes often.
- Rule: mark ownership and review cadence for pages that guide operational behavior.
- Rule: keep glossary terms precise and avoid competing definitions.
- Rule: remove or retire stale navigation instead of leaving misleading paths.

## Steps

1. Identify recurring questions and the audiences that ask them.
2. Map current docs, source systems, and known stale entries.
3. Define navigation: index, glossary, topic pages, and task-oriented entry points.
4. Decide which content should be canonical, linked, summarized, or retired.
5. Add maintenance rules for owners, review cadence, and drift triggers.
6. Validate the structure by tracing common lookup paths.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml