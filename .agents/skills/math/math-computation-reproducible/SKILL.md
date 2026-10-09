---
name: "math-computation-reproducible"
category: "skill-dev/sandbox"
maturity: "stable"
version: "1"
description: "Make mathematical computations reproducible — SymPy, Mathematica, Magma, Sage, Julia — with versioned environments (Docker/Conda/Nix), scripts, and result archival."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "All artifacts saved; container builds; result reproducible from artifacts alone."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "pull-request"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/math-computation-reproducible.json"
diataxis: "how-to"
tags: ["math"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: mathematical computation (symbolic / numeric) and target CAS.
- Output: versioned script + container + manifest.
- Scope: produces reproducible artifacts; no system-wide install beyond declared environment.
- Rule: produces reproducible artifacts; no system-wide install beyond declared environment.
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

Emit `MathComputationReproducibleArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/math-computation-reproducible/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Reproducible Math Computation

Run a **mathematical computation** that another researcher can rerun bit-for-bit — same inputs, same library versions, same outputs — and ship the artifacts.

## When to use

- A paper's result depends on a non-trivial computation.
- A computational number (e.g. counterexample, zeta value) needs to be cited.
- A reviewer wants to verify the calculation.

## Process

### 1. Pick the tool

- **SymPy / SymEngine** — symbolic, Python, free.
- **Mathematica** — broad coverage; commercial.
- **Magma** — number theory, algebra, finite groups.
- **SageMath** — open umbrella; bridges many libraries.
- **Julia (Nemo, Hecke, AbstractAlgebra)** — performance + algebra.

State the choice; pin version.

**Completion criterion:** tool and version fixed.

### 2. Script the computation

- One script per question (not a notebook cell dump).
- Inputs declared at the top.
- Random seeds explicit.
- Outputs written to files with content-hash filenames.

**Completion criterion:** script runs end-to-end from a clean checkout.

### 3. Pin the environment

- **Python:** `requirements.txt` with hashes, or `pixi.lock` / `uv.lock`.
- **Conda:** `environment.yml` with channel + version.
- **Mathematica:** `$Version` and `$SystemID` recorded.
- **Magma:** release version + OS.
- **OS:** declare base image (Ubuntu 22.04, etc.).

**Completion criterion:** env manifest saved with exact versions.

### 4. Containerise

- **Docker:** minimal image with the tool + dependencies.
- **Apptainer (Singularity):** for HPC clusters.
- **Nix:** for reproducible Linux builds.

The container must run the script and produce the declared outputs.

**Completion criterion:** container builds; produces identical outputs on a fresh host.

### 5. Archive and document

- Push code to a versioned repo (Git tag the result).
- Upload inputs / outputs to Zenodo with a DOI.
- Markdown report links: code repo, container image, Zenodo bundle, paper section.

**Completion criterion:** all artifacts reachable via DOI or Git tag.

## Notes

- Pair with `cs-formal-methods` for verification and `scientific-reproducibility` for broader framing.
- A reproducible computation earns a footnote in the paper.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml