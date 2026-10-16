---
description: "Compose skills into chains and workflows with explicit contracts: declare the producer-consumer edges between skills, verify artifact compatibility at each edge, and keep the chain inside a declared budget."
---
# skill-composition

When to use: Compose skills into chains and workflows with explicit contracts: declare the producer-consumer edges between skills, verify artifact compatibility at each edge, and keep the chain inside a declared budget.

## Workflow

1. **Declare the chain.** List the skills in order and, for each edge, the artifact the producer emits and the input the consumer declares. Use `analyze-artifacts` to check spec/plan/ticket agreement across the chain
2. **Verify edges.** Before running, check each edge: the producer's declared `outputs` satisfy the consumer's declared `inputs`. An incompatible edge is a design error, not a runtime error
3. **Budget.** Declare the chain budget (iterations, wall time, cost) and track it per edge (see `loop-budget`)
4. **Execute.** Run each skill in order, persisting each artifact with provenance. After each skill, record the edge evidence in the report
5. **Close.** Emit the `SkillChainReport` with the final artifact, the budget spent, and the next consumer

## Deliverables

- skill-chain-report artifact

## Guardrails

- risk: medium; trust tier: 3; approval required: no
- side effects: orchestration
- isolation: none; model tier: reasoning

Stop when: Every edge in the chain passed its artifact compatibility check and the chain stayed inside its declared budget.
