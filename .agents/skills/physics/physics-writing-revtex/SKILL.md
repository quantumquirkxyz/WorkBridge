---
name: "physics-writing-revtex"
category: "skill-dev/sandbox"
maturity: "stable"
version: "1"
description: "Write physics papers using RevTeX / APS / IOP / AIP formatting, with figure conventions, citation styles, and submission package preparation."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "PDF compiled in journal format; figure checklist complete; submission package ready."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "physics"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/physics-writing-revtex.json"
diataxis: "how-to"
tags: ["physics"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: paper content, journal choice.
- Output: compiled PDF + source package + figure checklist.
- Scope: formats and prepares; does not write scientific content.
- Rule: formats and prepares; does not write scientific content.
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

Emit `PhysicsWritingRevtexArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/physics-writing-revtex/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Physics Paper Writing — RevTeX and Formats

Prepare a **physics paper** in the target journal format — RevTeX (APS), IOP, AIP — with figures meeting conventions and a submission package.

## When to use

- A physics result needs to be submitted to a journal.
- A preprint needs to be formatted for arXiv or a conference.
- Figures need to match journal conventions.

## Process

### 1. Choose journal and format

- **APS / Physical Review** — RevTeX template (`revsym`, `revtwo`, `aps`.
- **IOP** — `iopart` class.
- **AIP** — `aip` / `aip-cp` class.

Download the template; check page limit and figure rules.

**Completion criterion:** template downloaded; rules noted.

### 2. Write the structure

Standard sections for physics papers:

- Title, authors, affiliations.
- Abstract (≤ 150 words for APS; check journal rules).
- Introduction (context, problem, previous work).
- Theory / Model (with equations, variables defined).
- Method / Experiment.
- Results (figures, data, analysis).
- Discussion (interpretation, comparison, limitations).
- Conclusion (key result, future work).
- References (BibTeX; check journal citation style).
- Acknowledgements (funding, collaborations).

**Completion criterion:** structure complete.

### 3. Figures

Journal rules vary; common conventions:

- **Resolution:** 300 dpi for raster, vector (PDF / EPS) preferred.
- **Colour mode:** CMYK for print, RGB for online; check journal.
- **Line thickness:** 0.5–1pt; avoid hairlines (too thin for print).
- **Font size:** consistent with body text (often 9pt in print).
- **Labels:** use `\label` / `\ref` for cross-references; avoid ambiguous numbering.

**Completion criterion:** figures comply with checklist; all cross-references resolved.

### 4. Compile and check

- Compile `.tex` with `pdfLaTeX` / `LuaLaTeX`; fix errors.
- Check reference list for duplicates / missing entries.
- Verify equation numbering; fix broken references.
- Check page count; trim or expand to meet limits.
- Check that the abstract contains no references to figures or equations (APS rule).

**Completion criterion:** compiled PDF; all checks passed.

### 5. Submission package

Prepare:

- Source `.tex` + `.bib` + `.sty` + figure files.
- Compiled `.pdf`.
- Metadata file (`title.tex`, `abstract.tex`, `keywords.tex`).
- `README.md` describing file structure.

**Completion criterion:** package saved; all files present.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml