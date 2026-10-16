---
name: "skill-composition"
category: "foundation"
maturity: "experimental"
version: "1"
description: "Compose skills into chains and workflows with explicit contracts: declare the producer-consumer edges between skills, verify artifact compatibility at each edge, and keep the chain inside a declared budget."
license: "MIT"
capabilities:
  - declare a skill chain as producer-consumer edges
  - verify artifact compatibility at each edge before execution
  - run a chain inside a declared iteration and cost budget
  - report per-edge handoff evidence for the chain
inputs:
  - an ordered set of skills forming a workflow
  - the artifact contract at each edge (producer outputs, consumer inputs)
  - the declared budget for the whole chain
outputs:
  - type: object
    name: SkillChainReport
  properties:
    status: { type: string, enum: [completed, blocked, budget-exceeded, partial] }
    chain: { type: "array", items: { type: "string" } }
    edges: { type: "array", items: { type: "object" } }
    artifacts: { type: "array", items: { type: "string" } }
    budgetSpent: { type: "object" }
    nextConsumer: { type: "string" }
    riskRemaining: { type: "string" }
  required: [status, chain, nextConsumer]
sideEffects:
  - orchestration
dependencies:
  - artifact-handoff
  - loop-budget
  - analyze-artifacts
  - work-item-router
stopCondition: "Every edge in the chain passed its artifact compatibility check and the chain stayed inside its declared budget."
risk: "medium"
trustTier: "3"
maxIterations: "10"
promptVersion: "1.0"
artifactType: "skill-chain-report"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: .agents/skills/platform/fixtures/behavioral/skill-composition.json
diataxis: "how-to"
tags: ["composition", "workflows", "handoff", "orchestration"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: an ordered skill chain with declared edges and a budget.
- Output: a `SkillChainReport` with per-edge evidence, artifacts produced, and budget spent.
- Scope: the chain runs only the declared skills in the declared order. An edge that fails its compatibility check stops the chain before execution.
- Rule: every handoff is an artifact handoff (see `artifact-handoff`). A skill that "just knows" what the previous skill produced is a broken edge.

## Procedure

1. **Declare the chain.** List the skills in order and, for each edge, the artifact the producer emits and the input the consumer declares. Use `analyze-artifacts` to check spec/plan/ticket agreement across the chain.
2. **Verify edges.** Before running, check each edge: the producer's declared `outputs` satisfy the consumer's declared `inputs`. An incompatible edge is a design error, not a runtime error.
3. **Budget.** Declare the chain budget (iterations, wall time, cost) and track it per edge (see `loop-budget`).
4. **Execute.** Run each skill in order, persisting each artifact with provenance. After each skill, record the edge evidence in the report.
5. **Close.** Emit the `SkillChainReport` with the final artifact, the budget spent, and the next consumer.

## Provenance

| Question | Answer |
|---|---|
| What is the source of truth? | The declared chain, the per-edge artifact contracts, and the chain budget |
| What is in scope? | Declare, verify edges, budget, execute in order, close with evidence |
| What is explicitly out of scope? | Running undeclared skills, reordering edges, or spending past the budget |
| Who or what consumes this artifact afterward? | The next skill in the workflow or the user receiving the final artifact |
| What evidence proves it is done? | SkillChainReport with per-edge compatibility evidence and budget spent |
| What risk remains? | An implicit edge that "just knows" the previous output without a contract |

## Artifact

`SkillChainReport` with `status`, `chain`, `edges`, `artifacts`, `budgetSpent`, `nextConsumer`, and `riskRemaining`.

## Reference

- The canonical prompt for this skill is versioned at `.agents/skills/prompts/skill-composition/v1.md` (prompt version 1.0).
- Governing skills: see the dependencies in the frontmatter for the skills this one composes with.

Every execution is traced via `record-execution.mjs`. The trace includes traceId, spanId, model tier, duration, tool calls, and quality score.

## Rationale

Skills chained by assumption drift: each step reinterprets the previous output until the workflow silently diverges. Declared producer-consumer edges with per-edge artifact compatibility checks turn a fragile sequence into a verifiable chain.

## Completion

- Every edge passed its compatibility check before execution.
- Every artifact carries provenance and satisfies its consumer's declared inputs.
- The chain stayed inside its declared budget, or stopped with `budget-exceeded`.
- No approval is required for composition itself: it only coordinates declared skills inside their own budgets, and each skill's own approval gates still apply.

## Failure modes

- Implicit edges: skills chained by assumption rather than by declared artifact contracts.
- Budget drift: the chain budget is spent on early edges and the final skill runs degraded; check the budget at every edge.
- Cycle: a chain that routes back to an earlier skill; the dependency graph (`skill-dependency-graph`) must stay a DAG.

---
@include .agents/skills/platform/contract-base.xml
