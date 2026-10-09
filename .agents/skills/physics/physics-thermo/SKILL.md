---
name: "physics-thermo"
category: "skill-dev/sandbox"
maturity: "stable"
version: "1"
description: "Model thermodynamic systems — first and second law, heat engines, entropy, phase transitions — with energy accounting and efficiency bounds."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Model thermodynamic systems complete; required sections present; completion criteria checked."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "physics"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/physics-thermo.json"
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

Emit `PhysicsThermoArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/physics-thermo/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Thermodynamics Modeling

Apply **thermodynamics** — first/second law, entropy, phase transitions — to a physical system with explicit energy accounting and efficiency limits.

## When to use

- The user wants to analyse an engine, refrigeration cycle, chemical process, or material phase change.
- A system needs energy conservation, entropy production, or efficiency bounds.
- Engineering / chemistry / physics requires a thermodynamic model.

## Process

### 1. Define the system

Name: open / closed / isolated. Identify the control volume (if any) and time window. List known and unknown state variables (T, P, V, U, H, S). State the working substance (ideal gas, real fluid, solid).

**Completion criterion:** system type, control volume, substance, and known/unknown variables all explicit.

### 2. First law (energy accounting)

Apply ΔU = Q − W for closed systems; ṁ(ĥ₂ − ĥ₁) for open systems. List each energy term and its sign convention. Write the energy balance equation.

**Completion criterion:** energy balance written with every term named and signed.

### 3. Second law (entropy)

Apply ΔS = ∫δQ_rev/T + S_gen. Compute S_gen ≥ 0. If an irreversibility is present (friction, mixing, finite ΔT), quantify it: lost work W_lost = T₀ · S_gen.

**Completion criterion:** entropy balance written; lost work computed if irreversibility present.

### 4. Pick the cycle / process

- Isothermal, adiabatic, polytropic, or specific process (Otto, Diesel, Rankine, Carnot, Brayton, refrigeration).
- For each step, apply the appropriate equation of state (ideal gas law, Van der Waals, Steam tables).
- Compute efficiency η = W_net / Q_in; compare to Carnot η = 1 − T_C/T_H.

**Completion criterion:** cycle named; each step computed; efficiency vs Carnot stated.

### 5. Phase transitions (if applicable)

- Clapeyron equation: dP/dT = ΔS/ΔV = ΔH/(TΔV).
- Phase diagram: identify phases, coexistence lines, critical point.
- Latent heat, specific heats, and supercooling / superheating.

**Completion criterion:** phase diagram described; latent heat and critical point computed.

### 6. Deliver

Markdown artifact: system definition, first law, second law, cycle analysis, efficiency, and the key bound (e.g. "this engine cannot exceed 60% Carnot efficiency at these temperatures").

**Completion criterion:** all sections present; efficiency bound stated.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml