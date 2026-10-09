---
name: "physics-astro"
category: "skill-dev/sandbox"
maturity: "stable"
version: "1"
description: "Model astrophysical systems — stellar structure, orbital dynamics, cosmology, gravitational waves — with physical scales, order-of-magnitude estimates, and scaling laws."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Model astrophysical systems complete; required sections present; completion criteria checked."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "physics"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/physics-astro.json"
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

Emit `PhysicsAstroArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/physics-astro/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Astrophysics Modeling

Model an **astrophysical system** — stellar, galactic, cosmological — with physical scales, order-of-magnitude estimates, and known scaling laws.

## When to use

- A stellar, planetary, galactic, or cosmological problem needs a quantitative model.
- Order-of-magnitude estimates for astrophysical phenomena.
- Connecting observations to physical theory.

## Process

1. Identify the astrophysical regime — stellar (fusion, HR diagram, mass-radius), orbital (Kepler's laws, n-body), galactic (dynamics, spiral structure), cosmological (FLRW, CMB, dark matter).
2. State physical scales — distances (AU, parsec, Mpc), masses (M☉), times (Myr, Gyr), temperatures.
3. Choose the governing physics — gravity (Newton/Einstein), thermodynamics, nuclear physics, radiation transport.
4. Apply scaling laws — Virial theorem, Jeans equations, mass-luminosity relation, Kepler's 3rd, Chandrasekhar limit, Schwarzschild radius.
5. Estimate numerically — order-of-magnitude before exact calculation; use the scaling to catch errors.
6. Check against observations — known values for comparable objects (e.g. Sun, Jupiter, Milky Way mass).
7. Deliver — artifact: regime, scales, governing physics, scaling laws applied, numerical estimate, observational check.

## Rules

- Rule: establish physical scale and regime before choosing equations.
- Rule: run an order-of-magnitude estimate before detailed computation.
- Rule: state units, constants, and cosmological parameters explicitly.
- Rule: compare estimates against known astrophysical objects or observed values.
- Rule: flag where Newtonian, relativistic, fluid, or radiative assumptions dominate.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml