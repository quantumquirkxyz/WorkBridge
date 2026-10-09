---
name: "cs-computability"
category: "cs"
maturity: "stable"
version: "1"
description: "Analyze computability questions — decidability, reductions, recognizability, and undecidability proofs — with formal problem transformations."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "The problem class, proof strategy, and reduction obligations are explicit and checked."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "cs"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/cs-computability.json"
diataxis: "how-to"
tags: ["cs"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: formal problem statement, machine/language definitions, and any known source problem.
- Output: classification, reduction or recognizer construction, and proof sketch.
- Scope: state assumptions about encodings and machine model before proving.
- Rule: state assumptions about encodings and machine model before proving.
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

Emit `CsComputabilityArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/cs-computability/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# cs-computability

Use this skill when the task involves decidability, recognizability, reductions, Rice-style reasoning, or a proof that a language or machine property cannot be decided.


## Rules

- Rule: define the language or decision problem before classifying it.
- Rule: name the reduction direction explicitly; for undecidability, reduce from a known hard problem to the target.
- Rule: separate decidable, recognizable, co-recognizable, and undecidable claims.
- Rule: verify that constructed machines halt exactly when the proof requires it.
- Rule: do not use Rice's theorem until the property is shown to be semantic and non-trivial.

## Steps

1. Restate the problem as a language membership or machine-property question.
2. Identify the closest canonical problem, such as `A_TM`, `HALT_TM`, `E_TM`, or `EQ_TM`.
3. Choose a proof strategy: decider, recognizer, mapping reduction, contradiction, or Rice theorem.
4. Build the machine transformation or algorithm with enough detail to check both directions.
5. Prove soundness and completeness of the construction.
6. State the final classification and any unresolved variants.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml