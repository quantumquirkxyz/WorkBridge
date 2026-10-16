---
description: "Analyze computability questions — decidability, reductions, recognizability, and undecidability proofs — with formal problem transformations."
---
# cs-computability

When to use: Analyze computability questions — decidability, reductions, recognizability, and undecidability proofs — with formal problem transformations.

## Workflow

1. Restate the problem as a language membership or machine-property question
2. Identify the closest canonical problem, such as `A_TM`, `HALT_TM`, `E_TM`, or `EQ_TM`
3. Choose a proof strategy: decider, recognizer, mapping reduction, contradiction, or Rice theorem
4. Build the machine transformation or algorithm with enough detail to check both directions
5. Prove soundness and completeness of the construction
6. State the final classification and any unresolved variants

## Deliverables

- cs artifact

## Guardrails

- risk: low; trust tier: 1; approval required: no
- side effects: none
- isolation: none; model tier: reasoning

Stop when: The problem class, proof strategy, and reduction obligations are explicit and checked.
