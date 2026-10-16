---
name: "evaluate-skill"
category: "skill-dev"
maturity: "stable"
version: "1"
description: "Evaluate a Skill against fixed scenarios for routing, completion, and artifact validity."
license: "MIT"
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Evaluate a Skill against fixed scenarios for routing, completion, and artifact validity complete; artifact saved; completion criteria checked."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "skill-dev"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ""
diataxis: "how-to"
tags: ["skill-dev"]
compatibility: []
approvalRequired: "false"
approvalFor: []
clauses:
  - id: EVALUATE-SKILL-1
    text: "Separate routing failures, artifact-shape failures, and contract mismatches instead of reporting one blurred verdict."
    check: "evals/behavioral/evaluate-skill-clauses.json#EVALUATE-SKILL-1"
  - id: EVALUATE-SKILL-2
    text: "Never promote a Skill whose declared side effects differ from observed behavior; treat missing stop conditions or vague outputs as evaluability defects."
    check: "evals/behavioral/evaluate-skill-clauses.json#EVALUATE-SKILL-2"
  - id: EVALUATE-SKILL-3
    text: "Preserve deterministic runner output as evidence and add or update a fixture whenever a failure represents a regression class."
    check: "evals/behavioral/evaluate-skill-clauses.json#EVALUATE-SKILL-3"
reloadPolicy: on-trigger
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

Emit `EvaluateSkillArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/evaluate-skill/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Evaluate Skill

Use this skill to check whether a Skill behaves predictably.

Scenario fixtures live in [`scenarios/`](scenarios/). They describe expected routes and static assertions for representative project-development workflows.
Behavioral fixtures live in [`behavioral-fixtures/`](behavioral-fixtures/). They describe representative artifact outputs that templates should continue to produce.

Use the deterministic runner when you need a repeatable regression check:

```bash
node .agents/skills/platform/evaluate-scenarios.mjs
node .agents/skills/platform/evaluate-behavioral-fixtures.mjs
```

## Steps

1. Load the Skill manifest and representative fixtures from `scenarios/`.
2. Run the static scenario evaluator when deterministic validation is enough.
3. Run the behavioral fixture evaluator after changing templates or artifact formats.
4. Check routing, output shape, stop condition, and safety behavior.
5. Check that the skill's contract matches the shape of its actual effects: routing-only skills should not write, write-capable skills should declare their side effects, and read-only skills should stay read-only.
6. Record the failures as regression cases by adding or updating a scenario or behavioral fixture.

## Rules

- Rule: separate routing failures, artifact-shape failures, and contract mismatches.
- Rule: preserve deterministic runner output as evidence.
- Rule: add or update fixtures when a failure represents a regression class.
- Rule: do not promote a Skill whose declared side effects differ from observed behavior.
- Rule: treat missing stop conditions or vague outputs as evaluability defects.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off

## Evaluación conductual (protocolo por pares)

The deterministic fixture checks in this skill are **structural**: they prove that documentation,
frontmatter, and artifact shape are correct. They never invoke a model, so they cannot prove that
a skill changes what an agent does. That claim needs the Layer 1 behavioural protocol in
[`evals/`](../../../../evals/README.md), whose full text lives in
[`references/paired-eval-protocol.md`](../references/paired-eval-protocol.md).

### With skill vs without skill

Evaluate a case twice, in a **fresh isolated session** each time: once with the skill and once
without it (`baseline`), same model snapshot, same task. Run **at least 3 trials** per arm before
believing a delta. Author fixtures in a separate session from the one you record in — authoring
context masks gaps, because a session that already holds the skill text is no longer a baseline.

### Two rubric axes, reported separately

Score and report two axes separately, never blended:

| Axis | Question it answers |
|---|---|
| `instructionFollowing` | Did the agent follow the skill's steps, boundaries, and conventions? |
| `goalCompletion` | Was the task actually done, with the evidence to prove it? |

Keep them separate because the gain from a skill is driven largely by instruction-following
(arXiv 2606.17819). A skill that raises `instructionFollowing` while leaving `goalCompletion`
flat is a skill worth keeping only if its cost is near zero.

### pass^k, not pass^1

`pass^1` is "did it work once". For a multi-step workflow, report `pass^k`, the probability that
`k` consecutive attempts all succeed (τ-bench, arXiv 2406.12045), for `k = 1..trials`. A skill
with `pass^1 = 0.8` and `pass^5 = 0.33` is not schedulable; a human has to watch it. The estimator
in `evals/run-behavioral.mjs` averages over size-`k` subsets of the recorded trials and is
deliberately pessimistic at `k = trials`.

### Cost-aware reporting

Never report a pass rate alone. Report tokens, duration, and cost beside it, per arm, then apply
the decision rule: positive delta within budget keeps the skill; positive delta over budget
needs an explicit justification; **zero delta at positive cost is a regression** — the skill
loads, consumes context and tokens, and changes nothing observable; a negative delta is a
regression and blocks promotion.

### Recording the triple

Record `(skill, version, fixture)` with every run (arXiv 2609.17394) so a result can be replayed
against the exact artifact that produced it.

---
@include .agents/skills/platform/contract-base.xml