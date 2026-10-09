---
name: "physics-data-analysis-root"
category: "skill-dev/sandbox"
maturity: "stable"
version: "1"
description: "Analyse experimental physics data with ROOT, pandas, uproot, NumPy — calibration, systematic errors, statistical inference, result archival — with reproducible scripts."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Script runs; report saved with error budget, systematic table, and plot links."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "data"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/physics-data-analysis-root.json"
diataxis: "how-to"
tags: ["physics"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: experimental data file(s), calibration constants, analysis goal.
- Output: analysis script + report.
- Scope: analyses data; does not change raw files.
- Rule: analyses data; does not change raw files.
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

Emit `PhysicsDataAnalysisRootArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/physics-data-analysis-root/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Physics Data Analysis — ROOT / Python

Analyse **experimental physics data** with reproducible scripts, explicit calibration, and a complete error budget.

## When to use

- Experimental data needs statistical analysis.
- A result needs a systematic error table.
- Data must be preserved with analysis linked.

## Process

### 1. Data loading and validation

- Load data (ROOT / HDF5 / CSV / binary); verify schema.
- Check for missing values, outliers, inconsistent units.
- Confirm file provenance (run number, detector state, date).

**Completion criterion:** data validated; provenance recorded.

### 2. Calibration

Apply:

- **Energy / momentum scale** — calibration from standard source.
- **Efficiency correction** — acceptance and reconstruction efficiency.
- **Background subtraction** — with statistical error.

Record the calibration constants with their uncertainties.

**Completion criterion:** calibration applied; constants with errors saved.

### 3. Statistical analysis

- **Histogram / fit** — with appropriate model (Gaussian, Poisson, exponential, custom).
- **Hypothesis test** — chi² / Kolmogorov-Smirnov / likelihood ratio.
- **Confidence interval** — 68% / 95% (bootstrap or analytic).
- **Systematic table** — each source (calibration, model, background, acceptance) with contribution.

**Completion criterion:** statistical result with error budget saved; systematic table present.

### 4. Results and plots

- **Plots:** data points + model / fit; systematic bands; labels with units.
- **Result summary:** value ± statistical ± systematic.
- **Reproducibility:** script saved; data file linked by DOI or path.

**Completion criterion:** plots saved; result summary present; script linked.

## Rules

- Rule: preserve raw data and write analysis outputs separately.
- Rule: record provenance, run conditions, calibration constants, and software environment.
- Rule: propagate statistical and systematic uncertainties separately.
- Rule: label plots with units, selections, and fit/model assumptions.
- Rule: make scripts reproducible from a clean checkout or documented environment.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml