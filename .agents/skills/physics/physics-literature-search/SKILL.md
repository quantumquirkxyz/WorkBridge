---
name: "physics-literature-search"
category: "skill-dev/sandbox"
maturity: "stable"
version: "1"
description: "Track physics literature — arXiv (hep-th, cond-mat, astro-ph, gr-qc, quant-ph, nucl-th, physics.*), INSPIRE-HEP, NASA ADS, Web of Science, citation alerts — with domain filters."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Digest saved; papers grouped; sources cited."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "physics"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/physics-literature-search.json"
diataxis: "how-to"
tags: ["physics"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: physics subfield, authors, keywords, time window.
- Output: digest + optional BibTeX.
- Scope: monitors and summarises; makes no scientific claim.
- Rule: monitors and summarises; makes no scientific claim.
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

Emit `PhysicsLiteratureSearchArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/physics-literature-search/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Physics Literature Search

Track the **front of physics** — arXiv, INSPIRE, NASA ADS, citation graphs — with explicit subfield filters and a relevance score.

## When to use

- The researcher needs to stay current in a subfield.
- A new project needs a literature survey.
- A paper needs a comparison with recent work.

## Process

### 1. Define the tracking set

- **Subfields** — arXiv categories (hep-th / cond-mat / astro-ph / quant-ph / gr-qc / nucl-th / physics.bio-ph, etc.).
- **Authors / institutions** — names to follow.
- **Keywords / methods** — terms for filtering (e.g. "superfluidity", "gravitational waves", "DFT").
- **Window** — since last digest (default 7 days).
- **Citation triggers** — papers that cite a tracked paper.

**Completion criterion:** set explicit; queries reproducible.

### 2. Pull from primary sources

- **arXiv** — daily RSS / API by category; filter with keywords.
- **INSPIRE-HEP** — for high-energy physics; citation graphs.
- **NASA ADS** — for astrophysics; journal links.
- **Web of Science / Crossref** — for journal versions and citation counts.
- **OpenAlex / Semantic Scholar** — for broader citation graphs.

Each item carries: title, authors, abstract, source, link, subfield, citation count.

**Completion criterion:** sources listed; items with full metadata.

### 3. Filter and score

Score 1–5:

- **5:** tracked author + tracked subfield + keyword match.
- **4:** two of three.
- **3:** neighbouring subfield or method.
- **2:** tangential.
- **1:** not relevant.

State the score reason.

**Completion criterion:** scores stated; reasons brief.

### 4. Group and deliver

Group by:

- Subfield (hep-th / cond-mat / astro-ph / quant-ph).
- Author / group.
- Method / technique.
- Milestone (e.g. "first observation of X", "resolution of open problem Y").

Deliver a Markdown digest with groups, abstract summaries, citation counts, and a **reading priority** (most relevant first).

**Completion criterion:** digest saved; priority stated; sources cited.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml