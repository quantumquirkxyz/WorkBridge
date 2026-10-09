---
name: "physics-classical"
category: "skill-dev/sandbox"
maturity: "stable"
version: "1"
description: "Solve classical mechanics problems — Newton's laws, Lagrangian, Hamiltonian, rigid body, orbital — with free-body diagrams, energy accounting, and dimensional checks."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Solve classical mechanics problems complete; required sections present; completion criteria checked."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "physics"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/physics-classical.json"
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

Emit `PhysicsClassicalArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/physics-classical/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Classical Mechanics

Solve a **classical mechanics** problem — Newton's laws, Lagrangian, Hamiltonian, or orbital — with free-body analysis, energy accounting, and dimensional checks.

## When to use

- A mechanical system needs its motion solved (forces, trajectories, equilibrium).
- Engineering, robotics, aerospace, or sports analysis.
- Rigid body rotation, orbital mechanics, or vibrations.

## Process

1. Identify system — particles, rigid body, continuous; degrees of freedom.
2. Draw free-body diagram — all forces with direction, labels, and units.
3. Choose formulation — Newtonian (F=ma), Lagrangian (L=T−V), Hamiltonian (H=T+V), or energy methods.
4. Write equations — Newton's 2nd / Euler-Lagrange / Hamilton's equations; include constraints (holonomic / nonholonomic).
5. Solve — analytically (harmonic oscillator, projectile, central force) or numerically (RK4 for ODEs, finite elements).
6. Dimensional check — verify [force]=[mass][acceleration]; no hidden unit mismatches.
7. Physical limits — check limiting cases (small angle, large mass, friction → 0).
8. Deliver — artifact: diagram, formulation, equations, solution, dimensional check, and limiting cases.

## Rules

- Rule: define coordinate system, sign conventions, and constraints before writing equations.
- Rule: account for every force, torque, or generalized coordinate.
- Rule: check units and limiting cases after deriving the solution.
- Rule: state when approximations such as small angle, massless string, or frictionless contact are used.
- Rule: prefer conservation laws when they simplify the problem without hiding assumptions.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml