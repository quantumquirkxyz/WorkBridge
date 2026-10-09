---
name: "math-computational"
category: "skill-dev/sandbox"
maturity: "stable"
version: "1"
description: "Solve numerical and symbolic math problems (root finding, integration, ODEs, symbolic manipulation) with stable algorithms and explicit error analysis."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Artifact contains algorithm, error bounds, verification, and final answer; solution is reproducible from the code shown."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "math"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/math-computational.json"
diataxis: "how-to"
tags: ["math"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: a numerical or symbolic mathematical problem.
- Output: Markdown artifact with algorithm choice, error analysis, computation, and verification.
- Scope: may execute code for numerical work but only in-memory, no file writes.
- Rule: may execute code for numerical work but only in-memory, no file writes.
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

Emit `MathComputationalArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/math-computational/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Computational Math

Solve a mathematical problem **numerically or symbolically** with an algorithm whose error, stability, and cost are explicit. Never ship a black-box answer.

## When to use

- The user wants a numerical result, symbolic simplification, or to choose between algorithms.
- A formula or expression needs to be evaluated, integrated, differentiated, or solved.
- An engineering / physics / quant problem needs a numerical kernel.

## Process

### 1. Frame the problem

Identify: input → output, the mathematical object (scalar / vector / function / matrix / ODE / PDE / integral), and the regime (smoothness, scale, boundary conditions). State whether an analytical or numerical answer is expected.

**Completion criterion:** problem restated as a clean mapping with regime noted.

### 2. Choose the algorithm

Pick the algorithm that matches the regime:

- **Root finding:** bisection (safe), Newton's (fast, needs derivative + good init), secant.
- **Integration:** Simpson / Gauss (smooth, 1D), Monte Carlo (high-D), adaptive quadrature (singularities).
- **ODEs:** explicit Euler (cheap, low order), RK4 (default), implicit (stiff), symplectic (Hamiltonian).
- **Linear systems:** direct (LU, Cholesky) vs iterative (CG, GMRES).
- **Symbolic:** CAS (SymPy / Mathematica) with manual simplification on top.

Name the algorithm and one reason it fits.

**Completion criterion:** algorithm named, with a one-line justification referencing the regime.

### 3. Estimate error and stability

For numerical work, state:

- **Local truncation error** and **global error** order.
- **Conditioning** — well-posed or ill-posed? Sensitivity to input noise.
- **Stability** — bounded-input-bounded-output? Stiffness concerns?
- **Cost** — O(n²)? O(n³)? Memory?

For symbolic work, state the simplification rules used and any non-canonical choices.

**Completion criterion:** error, stability, and cost all addressed for the chosen algorithm.

### 4. Implement / compute

Either run code (Python with NumPy/SciPy/SymPy) or hand-compute if tractable. For code, include:

- The algorithm in named functions, not one giant cell.
- Input validation (NaN, inf, dimension mismatch).
- Sanity asserts on outputs (sign, magnitude, symmetry).

**Completion criterion:** output produced and reproducible from the code shown.

### 5. Verify

Cross-check by at least one independent path:

- Different algorithm at lower fidelity.
- Asymptotic / limiting case (small/large parameter).
- Comparison against a known analytic solution or benchmark.
- Dimensional / sign / magnitude check.

**Completion criterion:** independent verification done; discrepancy explained or fixed.

### 6. Deliver

Markdown artifact with: problem, algorithm choice, error/stability/cost, code or computation, verification, and final answer with stated uncertainty (e.g. "to 6 significant digits").

**Completion criterion:** artifact contains algorithm, error bounds, verification, and a final answer whose precision is justified.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml