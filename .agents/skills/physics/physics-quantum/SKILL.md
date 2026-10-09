---
name: "physics-quantum"
category: "skill-dev/sandbox"
maturity: "stable"
version: "1"
description: "Model quantum systems (states, operators, measurement, entanglement) and perform calculations using Dirac notation, with checks against limits and known results."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Model quantum systems (states, operators, measurement, entanglement) and perform calculations using Dirac notation, with checks against limits and known results complete; required sections present; completion criteria checked."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "physics"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/physics-quantum.json"
diataxis: "how-to"
tags: ["physics"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: skill invocation with the user's request and available context.
- Output: a structured artifact or guidance aligned to the skill's declared outputs.
- Scope: stay within the skill's declared boundaries; do not broaden without explicit direction.
- Rule: follow the skill's completion criteria and stop condition exactly.

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

Emit `PhysicsQuantumArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/physics-quantum/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Quantum Physics Modeling

Construct a **quantum model** of a system — state space, Hamiltonian, measurement — and answer a question about it with explicit regime checks.

## When to use

- The user wants to model a quantum system or compute an observable.
- A claim from quantum information, quantum computing, atomic/molecular physics, or condensed matter needs grounding.
- Another skill (e.g. `cs-cryptography` or quantum-related ML) needs a quantum-mechanical sub-model.

## Process

### 1. Define the system

Specify:

- **Hilbert space** — finite (qubits, spin-1/2) or infinite (position, Fock).
- **Basis** — computational, Fock, position, momentum.
- **State** — pure |ψ⟩ or mixed ρ; for multi-party, identify subsystems.
- **Hamiltonian** — kinetic + potential; cite which interactions are kept.

**Completion criterion:** Hilbert space, basis, state, and Hamiltonian all explicit.

### 2. Identify the regime

Locate the system in the taxonomy:

- Non-relativistic vs relativistic (Schrödinger vs Dirac).
- Single-particle vs many-body.
- Closed vs open (Lindblad master equation if open).
- Discrete (qubit) vs continuous-variable.

Pick the right formalism: Schrödinger picture, Heisenberg, interaction picture, path integral.

**Completion criterion:** regime and formalism chosen with a one-line justification.

### 3. Compute

Solve by the path that matches the system:

- **Exactly solvable** — harmonic oscillator, hydrogen, two-level, Jaynes–Cummings.
- **Perturbation theory** — time-independent or time-dependent; cite the small parameter.
- **Variational** — ansatz + minimize ⟨ψ|H|ψ⟩.
- **Numerical** — exact diagonalisation, DMRG, tensor networks, QMC.

For each step, state approximations and truncations.

**Completion criterion:** method named, approximations listed, computation executed.

### 4. Units and limits check

- **Units:** verify ℏ, c, k_B are set correctly; energies, lengths, times have plausible orders of magnitude.
- **Limits:** check classical limit (ℏ→0), continuum limit, weak-coupling limit, large-N limit.
- **Symmetries:** confirm the answer respects them (rotational, particle-number, parity).

**Completion criterion:** units sanity-checked; at least one limit recovered.

### 5. Deliver

Markdown artifact with: system definition, regime, computation, units/limits, and the answer with an uncertainty or approximation note. Cite the method used.

**Completion criterion:** artifact covers all five; answer is reproducible.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml