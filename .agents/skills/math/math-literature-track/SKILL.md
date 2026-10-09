---
name: "math-literature-track"
category: "skill-dev/sandbox"
maturity: "stable"
version: "1"
description: "Track mathematics literature across arXiv, MathSciNet, zbMATH, journal alerts, and citation graphs to keep a researcher current without drowning in papers."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "digest artifact saved with grouped papers and relevance scores; all sources cited."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "math"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/math-literature-track.json"
diataxis: "how-to"
tags: ["math"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: researcher's keywords, authors, categories, and time window.
- Output: Markdown digest and optional BibTeX/CSV.
- Scope: reads and summarises; no new mathematical claims.
- Rule: reads and summarises; no new mathematical claims.
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

Emit `MathLiteratureTrackArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/math-literature-track/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Math Literature Tracking

Track the **front of mathematics** that matters to the researcher, with explicit sources and a personal relevance signal.

## Process

### 1. Define the tracking set

State:

- **Categories** — arXiv (e.g. math.AG + math.NT + math.PR).
- **Authors** — names to follow.
- **Keywords** — title / abstract terms (e.g. "Galois representation", "Lyapunov exponent").
- **Window** — since last digest (default 7 days).
- **Citation triggers** — when a paper cites an old paper of interest.

**Completion criterion:** set is explicit; queries reproducible.

### 2. Pull from primary sources

- **arXiv:** `arxiv` API / RSS by category, then filter.
- **MathSciNet / zbMATH:** metadata, reviews, MSC codes.
- **Crossref / DOI:** journal versions.
- **Semantic Scholar / OpenAlex:** citation graph.

Each item carries: title, authors, abstract, source, link, MSC codes, citation count.

**Completion criterion:** each item sourced; missing data flagged.

### 3. Score relevance

For each paper, score 1–5:

- **5:** by a tracked author, in a tracked category, matches a tracked keyword.
- **4:** close match (one of three).
- **3:** neighbouring field; possibly useful.
- **2:** tangentially related.
- **1:** not relevant.

State the score reason in one sentence.

**Completion criterion:** every paper scored; reason stated.

### 4. Group

Group by:

- **By topic** (cluster of papers on the same question).
- **By author** (output of a followed researcher).
- **By method** (which technique family).
- **By milestone** (e.g. "extends Theorem X", "refutes Conjecture Y").

**Completion criterion:** groupings explicit; at least two perspectives.

### 5. Deliver the digest

Markdown artifact with: header (window), groups, scored items, follow-ups (papers to read deeply), citations, and **suggested reading order** (most relevant first).

**Completion criterion:** digest saved; reading order stated.

## Notes

- This is **monitoring**, not **review** — for deep analysis use `research` or `scientific-literature-review`.
- Maintain a persistent `digest/` folder indexed by date.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml