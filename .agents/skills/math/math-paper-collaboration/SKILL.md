---
name: "math-paper-collaboration"
category: "skill-dev/sandbox"
maturity: "stable"
version: "1"
description: "Manage mathematical paper collaboration — Overleaf / GitHub / arXiv integration, citation tracking, version control, reproducible computation links, and co-author coordination."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Source repository has version tags; collaboration rules saved; arXiv package complete."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "math"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/math-paper-collaboration.json"
diataxis: "how-to"
tags: ["math"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: paper title, co-authors, citation database, computation artifacts.
- Output: shared repo + collaboration rules + arXiv package.
- Scope: manages collaboration artifacts; does not write the mathematics.
- Rule: manages collaboration artifacts; does not write the mathematics.
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

Emit `MathPaperCollaborationArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/math-paper-collaboration/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Math Paper Collaboration

Coordinate a **mathematical paper** from first draft to arXiv submission — with version control, citation tracking, reproducible computation links, and co-author rules.

## When to use

- A paper has multiple co-authors.
- A paper needs a reproducible computation appendix.
- A paper needs to be submitted to arXiv with clean source.

## Process

### 1. Set up the repository

Choose:

- **Overleaf** — for LaTeX users who prefer an integrated editor; share link.
- **GitHub + Overleaf sync** — for version control + easy collaboration.
- **Git + arXiv source** — for full reproducibility; push source + compiled PDF.

Create:

- `main.tex`, `references.bib`, `styles/`.
- `reproducibility/` folder linking to computation artifacts (see `math-computation-reproducible`).

**Completion criterion:** repository initialised; co-authors have access.

### 2. Citation database

- Maintain a single `.bib` file; no duplicate keys.
- Use `bibtex` or `biber`; declare a style (`amsplain`, `alpha`, etc.).
- Track sources: each entry links to a source (arXiv, journal, book).
- For each citation in the paper, confirm it supports the claim (not just nearby in text).

**Completion criterion:** `.bib` clean; citations verified.

### 3. Collaboration rules

Document (e.g. `COLLABORATION.md`):

- **Who writes which section** — by name / role.
- **Review cycle** — who reads which version; how comments are tracked.
- **Merge rules** — how edits are integrated (pull request / Overleaf track changes).
- **Version tags** — `v0.1` (draft), `v1.0` (submission), `v1.1` (revision).
- **Authorship order** — confirmed by all co-authors.

**Completion criterion:** rules file saved and acknowledged by co-authors.

### 4. Reproducibility links

Link to computation artifacts:

- Git tag / DOI for the computation.
- Container image hash.
- Manifest file.

In the paper appendix, cite the computation: "Verified with SymPy 1.13; see repository [DOI] for code, container, and manifest."

**Completion criterion:** links present; reproducibility statement in appendix.

### 5. ArXiv package

Prepare:

- Source `.tex` + `.bib` + `.sty`.
- Figures (`.tikz`, `.pdf`).
- Compiled `.pdf`.
- Metadata (`title.tex`, `abstract.tex`).
- `README.md` describing the structure.

**Completion criterion:** package complete; arXiv upload possible.

## Notes

- Pair with `math-computation-reproducible` for the computation appendix.
- Pair with `math-formal-proof` for a formal proof appendix.
- For co-authors using different tools, agree on `.bib` format early.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml