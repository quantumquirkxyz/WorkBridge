---
name: "research-literature-review"
category: "research"
maturity: "stable"
version: "1"
description: "Review research literature — search strategy, screening, synthesis, citation tracking, and evidence grading — with transparent inclusion criteria."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Search strategy, screening criteria, synthesis, and evidence limitations are explicit."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "review"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/research-literature-review.json"
diataxis: "how-to"
tags: ["research"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: research question, domain, databases/sources, time range, inclusion/exclusion criteria, and desired review depth.
- Output: search protocol, screened evidence set, synthesis, limitations, and citation/provenance notes.
- Scope: distinguish evidence found, evidence excluded, and evidence not searched.
- Rule: distinguish evidence found, evidence excluded, and evidence not searched.
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

Emit `ResearchLiteratureReviewArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/research-literature-review/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# research-literature-review

Use this skill when planning or performing a literature review, evidence scan, related-work section, systematic screening, or research synthesis.


## Rules

- Rule: state the research question before choosing search terms.
- Rule: document databases, queries, dates searched, and inclusion/exclusion criteria.
- Rule: screen titles/abstracts and full text consistently against the criteria.
- Rule: grade evidence quality and relevance separately.
- Rule: preserve citation provenance so claims can be traced back to sources.

## Steps

1. Define the research question, scope, and review type.
2. Choose databases, sources, keywords, synonyms, and citation-chaining strategy.
3. Run and record searches with dates and query strings.
4. Screen results using explicit inclusion and exclusion criteria.
5. Extract claims, methods, population/context, results, and limitations.
6. Synthesize themes, disagreements, gaps, and confidence level.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml