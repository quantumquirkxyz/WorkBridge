---
name: "cs-algorithms"
category: "skill-dev/sandbox"
maturity: "stable"
version: "1"
description: "Design and analyse algorithms — correctness proof, complexity analysis (time and space), and stability — with explicit proof of invariants and termination."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Design and analyse algorithms complete; required sections present; completion criteria checked."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "cs"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/cs-algorithms.json"
diataxis: "how-to"
tags: ["cs"]
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

Emit `CsAlgorithmsArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/cs-algorithms/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# CS Algorithms

Design, analyse, and verify an **algorithm** — its correctness, complexity, stability, and invariants — with an explicit proof structure.

## When to use

- The user needs an algorithm designed or analysed.
- A data structure choice needs justification.
- Performance or correctness requires proof.

## Process

1. Problem statement — input, output, pre/post conditions.
2. Algorithm design — strategy (divide and conquer, greedy, dynamic programming, backtracking, etc.); justify why it fits.
3. Pseudocode / code — clean, with clear variable names.
4. Correctness proof — loop invariant; termination; initialisation, maintenance, termination. Or proof by contradiction / induction for non-loop structures.
5. Complexity analysis — time (best/average/worst), space; use Big-O with justification (count operations, recursion depth).
6. Stability — if numerical, numerical stability; if combinatorial, output stability.
7. Deliver — artifact: problem, design, code/pseudocode, correctness proof, complexity, stability note.

## Rules

- Rule: define inputs, outputs, and preconditions before proposing the algorithm.
- Rule: prove correctness with an invariant, induction, exchange argument, or contradiction that matches the strategy.
- Rule: analyze time and space separately and name all size parameters.
- Rule: test the algorithm against edge cases and adversarial inputs.
- Rule: state when a simpler baseline is preferable to a more complex optimization.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml