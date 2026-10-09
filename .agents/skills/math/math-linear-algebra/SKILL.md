---
name: "math-linear-algebra"
category: "skill-dev/sandbox"
maturity: "stable"
version: "1"
description: "Solve and analyse linear algebra problems — matrix decompositions (LU, QR, SVD, eigendecomposition), linear systems, and applications in ML, graphics, and optimisation."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Solve and analyse linear algebra problems complete; required sections present; completion criteria checked."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "math"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/math-linear-algebra.json"
diataxis: "how-to"
tags: ["math"]
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

Emit `MathLinearAlgebraArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/math-linear-algebra/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Linear Algebra

Apply **linear algebra** — decompositions, solving systems, transformations — with explicit numerical stability and interpretation.

## When to use

- User needs a matrix decomposition, linear system solved, or eigenproblem.
- ML, graphics, optimisation, or signal processing needs a linear-algebra backbone.
- Numerical stability of a computation is in question.

## Process

1. Identify problem type — linear system Ax = b, eigenvalue problem Ax = λx, SVD, least squares, PCA, or transformation.
2. State matrix properties: shape, rank, symmetry, positive-definiteness, sparsity.
3. Choose decomposition / method — LU (stable for well-conditioned), Cholesky (SPD), QR (least-squares), SVD (rank-deficient / ill-posed), eigendecomposition (diagonalisation).
4. Compute — with explicit pivoting strategy and condition number estimate.
5. Validate — residual ||Ax−b||, orthogonality of eigenvectors, singular values non-negative, backward error.
6. Interpret — in the problem domain (e.g. SVD: principal components, condition number → sensitivity; eigenvalues: stability of dynamical system).
7. Deliver — artifact with matrix properties, decomposition chosen, computation, residual/validation, and domain interpretation.

## Rules

- Rule: inspect matrix shape, rank, symmetry, sparsity, and conditioning before selecting a method.
- Rule: prefer numerically stable decompositions over explicit matrix inversion.
- Rule: report residuals, condition number, or backward error when solving numerically.
- Rule: separate exact symbolic reasoning from floating-point computation.
- Rule: interpret the result in the original problem domain, not only as matrix algebra.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml