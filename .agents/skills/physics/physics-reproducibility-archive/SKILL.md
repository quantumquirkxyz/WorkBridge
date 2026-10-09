---
name: "physics-reproducibility-archive"
category: "skill-dev/sandbox"
maturity: "stable"
version: "1"
description: "Make physics research reproducible and archive it — Zenodo DOI, GitHub + container (Docker/Apptainer), data preservation, code review, and open-science compliance for journals and funders."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Zenodo DOI assigned; GitHub tag created; checklist complete."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "pull-request"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/physics-reproducibility-archive.json"
diataxis: "how-to"
tags: ["physics"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: physics result, data, and code.
- Output: Zenodo DOI + GitHub release + checklist.
- Scope: archives and links; does not execute long computations.
- Rule: archives and links; does not execute long computations.
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

Emit `PhysicsReproducibilityArchiveArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/physics-reproducibility-archive/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Physics Reproducibility and Archival

Make a **physics result** reproducible and archive it with a DOI — data, code, and environment — for compliance with journals and funders.

## When to use

- A paper is being submitted to a journal that requires data availability.
- A funder (DOE, NSF, ERC) requires open data / code.
- A reviewer or collaborator needs to reproduce a result.

## Process

### 1. Inventory the artifacts

List:

- **Raw data** — unprocessed files from the experiment / simulation.
- **Processed data** — calibrated and cleaned.
- **Analysis code** — scripts that produce figures and tables.
- **Simulation code** — input parameters, source, build instructions.
- **Environment** — library versions, OS, compilers.
- **Figures and tables** — with captions that cite the source data.

**Completion criterion:** inventory saved as `REPRODUCIBILITY.md`.

### 2. Prepare for archival

- **Data:** clean, documented schema; remove PII; check file formats (open preferred: CSV, HDF5, FITS; avoid proprietary).
- **Code:** add README, `setup.py` / `pyproject.toml`, test that it runs.
- **Documentation:** usage instructions, expected output, hardware requirements.
- **Licence:** MIT, Apache 2.0, or CC0 for data; GPL for code (choose before upload).

**Completion criterion:** inventory items prepared; licence chosen.

### 3. Containerise

- **Docker:** `Dockerfile` with base image, tool versions, code, data.
- **Apptainer:** `.def` file for HPC clusters.
- Include: exact tool versions (not `latest`); build instructions; run command.

**Completion criterion:** container builds; produces expected output on a fresh host.

### 4. Archive on Zenodo

Create a Zenodo deposit:

- **Title:** descriptive and unique (not just "Data for paper").
- **Authors:** all contributors, with ORCIDs.
- **Keywords:** physics terms (e.g. "quantum optics", "cosmology", "plasma physics").
- **Licence:** stated.
- **Related identifiers:** link to the paper (arXiv DOI or journal DOI).
- **Upload:** data + code + container (or link to Docker Hub / GHCR).

**Completion criterion:** Zenodo record created; DOI assigned.

### 5. GitHub release

- Tag the repository with the paper version (e.g. `v1.0`).
- Write a release note: what changed, what is archived.
- Link to the Zenodo DOI in the release.

**Completion criterion:** GitHub release created; DOI linked.

### 6. Checklist and compliance

- **Journal requirements** — which journals require data / code? (Nature, Science, APS, IOP all have policies).
- **Funder requirements** — NSF, DOE, ERC open-data mandates.
- **FAIR compliance** — check Findable, Accessible, Interoperable, Reusable.
- **Supplemental material** — prepare for journal submission (separate from archival).

**Completion criterion:** checklist saved; compliance status per requirement.

## Notes

- Pair with `physics-simulation-setup` for simulation containerization.
- Pair with `physics-experimental-notebook` for experimental data archival.
- Pair with `physics-writing-revtex` for journal submission.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml