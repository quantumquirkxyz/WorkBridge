---
name: "physics-simulation-setup"
category: "skill-dev/sandbox"
maturity: "stable"
version: "1"
description: "Set up reproducible physics simulations — Monte Carlo (GEANT4), molecular dynamics (LAMMPS), DFT (VASP, Quantum ESPRESSO), quantum dynamics (QuTiP) — with containers, parameter files, and verification."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Container builds; parameters saved; verification report shows agreement with benchmark."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "physics"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/physics-simulation-setup.json"
diataxis: "how-to"
tags: ["physics"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: physical system description and simulation goal.
- Output: parameter files + container + verification.
- Scope: produces simulation setup; does not run long computations unless user executes container.
- Rule: produces simulation setup; does not run long computations unless user executes container.
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

Emit `PhysicsSimulationSetupArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/physics-simulation-setup/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Physics Simulation Setup

Prepare a **reproducible simulation** for a physics system — Monte Carlo, molecular dynamics, DFT, quantum dynamics — with exact parameters and a verification step.

## When to use

- A research question needs numerical simulation.
- A simulation result needs to be reproducible by reviewers or collaborators.
- A publication requires code and environment details.

## Process

### 1. Select the simulation family

- **Monte Carlo** — GEANT4 (particle physics), ROOT / Pythia.
- **Molecular dynamics** — LAMMPS (classical), GROMACS (biomolecules).
- **DFT** — VASP, Quantum ESPRESSO, ABINIT.
- **Quantum dynamics** — QuTiP (open quantum systems), Julia (DynamicalSystems.jl).

State choice and why.

**Completion criterion:** family and tool named; justification stated.

### 2. Define the system

- **Geometry / lattice / potential** — input file with exact parameters.
- **Initial conditions** — thermal, ground state, excited state.
- **Boundary conditions** — periodic, open, vacuum, fixed.
- **Physical units** — eV, K, angstrom, fs, with conversion notes.

**Completion criterion:** all parameters explicit; units consistent.

### 3. Configure the simulation

- **Timestep** — justified by stability criteria.
- **Integration length** — long enough for convergence, short enough for feasibility.
- **Sampling / statistics** — number of trajectories, statistical error target.
- **Output format** — HDF5 / CSV / ROOT with a schema description.

**Completion criterion:** configuration file complete; schema described.

### 4. Containerise

- **Docker:** base image with the simulation tool + dependencies.
- **Apptainer:** for HPC clusters.
- Include: parameter file, script, environment file with versions.

**Completion criterion:** container builds; runs and produces expected output.

### 5. Verify

Compare against:

- **Analytical limit** — e.g. ideal gas law, harmonic oscillator, free particle.
- **Benchmark** — known result from literature or standard test case.
- **Convergence** — result stable as parameter (timestep, grid size, trajectory count) changes.

Report agreement (percentage difference) and note any discrepancy.

**Completion criterion:** verification report saved; agreement stated.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml