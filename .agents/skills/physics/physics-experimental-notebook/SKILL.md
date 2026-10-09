---
name: "physics-experimental-notebook"
category: "skill-dev/sandbox"
maturity: "stable"
version: "1"
description: "Maintain experimental physics lab notebooks — measurements, calibration, error analysis, FAIR data principles, reproducibility — with digital and physical structure."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Notebook entry saved with all sections; calibration and error analysis complete; FAIR checklist filled."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "physics"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/physics-experimental-notebook.json"
diataxis: "how-to"
tags: ["physics"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: experiment setup, measurements, calibration data.
- Output: digital notebook entry + FAIR checklist.
- Scope: produces documentation artifacts; no changes to equipment.
- Rule: produces documentation artifacts; no changes to equipment.
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

Emit `PhysicsExperimentalNotebookArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/physics-experimental-notebook/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Experimental Physics Notebook

Build an **experimental lab notebook** — structured, reproducible, FAIR-compliant — that another physicist could use to reproduce the measurement.

## When to use

- A measurement has been made.
- Data must be preserved for publication or collaboration.
- A reviewer asks for raw data or calibration details.

## Process

### 1. Experiment description

State:

- **Physical system** — apparatus, conditions (T, P, B, etc.), scale.
- **Measured quantity** — with units and expected magnitude.
- **Purpose** — hypothesis tested or parameter extracted.
- **References** — theory / prior measurement.

**Completion criterion:** all elements present.

### 2. Setup and calibration

Document:

- **Apparatus** — instruments with model numbers, settings.
- **Calibration procedure** — standard source, method, date, result.
- **Traceability** — chain to a national/international standard if applicable.
- **Calibration uncertainty** — propagated into the final result.

**Completion criterion:** calibration documented with traceability and uncertainty.

### 3. Measurements

Record:

- **Raw data** — time stamps, conditions, instrument readings.
- **Data format** — file format (CSV, HDF5, ROOT) with schema description.
- **Sampling rate / integration time** — with justification.
- **Environment conditions** — during measurement (temperature, humidity, magnetic field, vibration).

**Completion criterion:** raw data linked; format described.

### 4. Error analysis

Distinguish:

- **Statistical errors** — variance of repeated measurements.
- **Systematic errors** — calibration errors, instrument bias, environmental effects.
- **Combined uncertainty** — root-sum-square or full covariance matrix.
- **Sensitivity analysis** — how does the result change with key parameter perturbation?

**Completion criterion:** statistical and systematic errors quantified; combined uncertainty reported.

### 5. FAIR checklist

- **Findable** — metadata (title, authors, date, keywords) in a repository (Zenodo, OSF, institutional).
- **Accessible** — open access policy; file formats (CSV, HDF5) with open specifications.
- **Interoperable** — metadata uses standard vocabularies (e.g. Dublin Core, DataCite, FAIRsharing).
- **Reusable** — licence (CC0 / MIT), code for analysis linked, version control (Git tag / DOI).

**Completion criterion:** checklist filled; DOI or Git tag assigned.

### 6. Deliver

Markdown entry with: description, setup, calibration, measurements, error analysis, FAIR checklist, and linked data. The entry should be readable by another physicist without the original experimenter.

**Completion criterion:** entry saved; all links active; FAIR checklist complete.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml