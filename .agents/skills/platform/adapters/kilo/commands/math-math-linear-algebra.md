---
description: "Solve and analyse linear algebra problems — matrix decompositions (LU, QR, SVD, eigendecomposition), linear systems, and applications in ML, graphics, and optimisation."
---
# math-linear-algebra

When to use: Solve and analyse linear algebra problems — matrix decompositions (LU, QR, SVD, eigendecomposition), linear systems, and applications in ML, graphics, and optimisation.

## Workflow

1. Identify problem type — linear system Ax = b, eigenvalue problem Ax = λx, SVD, least squares, PCA, or transformation
2. State matrix properties: shape, rank, symmetry, positive-definiteness, sparsity
3. Choose decomposition / method — LU (stable for well-conditioned), Cholesky (SPD), QR (least-squares), SVD (rank-deficient / ill-posed), eigendecomposition (diagonalisation)
4. Compute — with explicit pivoting strategy and condition number estimate
5. Validate — residual ||Ax−b||, orthogonality of eigenvectors, singular values non-negative, backward error
6. Interpret — in the problem domain (e.g. SVD: principal components, condition number → sensitivity; eigenvalues: stability of dynamical system)
7. Deliver — artifact with matrix properties, decomposition chosen, computation, residual/validation, and domain interpretation

## Deliverables

- math artifact

## Guardrails

- risk: low; trust tier: 1; approval required: no
- side effects: none
- isolation: none; model tier: reasoning

Stop when: Solve and analyse linear algebra problems complete; required sections present; completion criteria checked.
