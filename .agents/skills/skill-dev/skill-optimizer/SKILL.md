---
name: "skill-optimizer"
category: "skill-dev"
maturity: "experimental"
version: "1"
description: "Optimize a quirk Skill's model-facing description against routing fixtures with a propose-only reflective loop. Use when a Skill routes wrong, fires too rarely or too often, or when evaluate-skill or skill-quality-gate reports a routing regression. Emits a diff-shaped proposal with (skill, version, fixture) evidence; the human applies it. Not for body edits or metadata repair."
license: "MIT"
capabilities:
  - score skill description routing evidence
  - evolve description candidates reflectively
  - emit an apply-ready description proposal
inputs:
  - one target skill directory or skill name
  - routing fixtures with expected outcomes
  - the current description text of that skill
outputs:
  - type: object
    description: Description optimization proposal with held-out evidence and provenance triples
    properties:
      skill:
        type: string
      version:
        type: string
      currentDescription:
        type: string
      candidateDescription:
        type: string
      capacity:
        type: object
        properties:
          characters:
            type: integer
          cap:
            type: integer
          withinCap:
            type: boolean
      split:
        type: object
        properties:
          train:
            type: array
            items:
              type: string
          heldOut:
            type: array
            items:
              type: string
      evaluations:
        type: array
        items:
          type: object
          properties:
            skill:
              type: string
            version:
              type: string
            fixture:
              type: string
            score:
              type: number
            feedback:
              type: string
      decision:
        type: string
      reasons:
        type: array
        items:
          type: string
sideEffects: []
dependencies: []
stopCondition: "Skill description optimization proposal emitted with held-out evidence, or an explicit no-defensible-change verdict; target skill untouched; completion criteria checked."
risk: "low"
trustTier: "2"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "skill-dev"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ""
diataxis: "how-to"
tags: ["skill-dev", "optimization", "routing"]
compatibility: ["evaluate-skill", "skill-quality-gate"]
approvalRequired: "false"
approvalFor: []
clauses:
  - id: SKILL-OPTIMIZER-1
    text: "Never write to the target Skill; emit a proposal and stop, because routing changes must stay reviewable by the skill author."
    check: "evals/behavioral/skill-optimizer.json#SKILL-OPTIMIZER-1"
  - id: SKILL-OPTIMIZER-2
    text: "Never claim an improvement that was not measured on held-out fixtures the candidate never saw."
    check: "evals/behavioral/skill-optimizer.json#SKILL-OPTIMIZER-2"
  - id: SKILL-OPTIMIZER-3
    text: "Never propose a description above the 1024-character capacity cap, and never widen the target beyond the description field."
    check: "evals/behavioral/skill-optimizer.json#SKILL-OPTIMIZER-3"
reloadPolicy: on-trigger
---

## Contract

- Input: one target skill (directory or name), its routing fixtures with expected outcomes, and the current description text.
- Output: `SkillOptimizerProposal` — a diff-shaped description change with per-fixture evidence, or an explicit no-defensible-change verdict.
- Scope: the model-facing `description` field only. Body, frontmatter metadata, and the lockfile belong to other skills.
- Rule: the optimizer proposes, a human applies. A run that ends with a written `SKILL.md` is a defect, not a result.
- Rule: an improvement claim is measured on held-out fixtures the candidate never saw during reflection.
- Rule: every evaluation row carries a (skill, version, fixture) triple so any score can be traced back to the exact run that produced it.

## Guardrails

- Never write to the target skill, its frontmatter, or `skills-lock.json`; the proposal is the deliverable.
- Never accept a candidate that regresses any single held-out fixture, even when its mean improves.
- Never treat a fixture that expects silence as passed because the skill stayed silent; it passes only when the reason matches the expectation.
- Never widen the target beyond the description field. Body changes, metadata repair, and lockfile updates are other skills' work.

## Provenance

| Question | Answer |
|---|---|
| What is the source of truth? | The target skill's `SKILL.md` description plus the fixture set's expected routing outcomes |
| What is in scope? | Description text changes justified by routing evidence, bounded by the 1024-character capacity cap |
| What is explicitly out of scope? | Body edits, frontmatter metadata repair, lockfile updates, and any direct write to the skill |
| Who or what consumes this artifact afterward? | The skill author, who applies or rejects the proposal; then evaluate-skill re-runs the fixtures |
| What evidence proves it is done? | Each evaluation row carries a (skill, version, fixture) triple and the decision cites held-out scores |
| What risk remains? | Fixture sets too small to hold out evidence, and changes that trade one routing error for another |

## Artifact

Return `SkillOptimizerProposal` as structured output in the current response. Do not write local artifact files, and never write the target skill, unless the user explicitly asks for an export.

| Field | Meaning |
|---|---|
| `skill` | Target skill name, matching the directory name |
| `version` | Skill version the evidence was measured against |
| `currentDescription` | Description text before the change |
| `candidateDescription` | Proposed description text |
| `capacity` | Character count against the 1024 cap |
| `split` | Fixture ids assigned to train and to held-out |
| `evaluations` | One row per fixture run: `{ skill, version, fixture, score, feedback }` |
| `decision` | `accept`, `reject`, or `tie`, with the reasons |

## Why

A Skill's description is its routing surface: it is the only part of the skill that sits in the agent's context on every turn, and it is what the model reads when deciding whether to fire the skill. A description that routes wrongly is therefore a measurement problem, not a taste problem — and it can be measured with the fixtures `evaluate-skill` already owns.

The loop below borrows GEPA's shape: evolve text against execution evidence, using natural-language reflection on failing runs instead of scalar rewards alone, and select candidates from a Pareto frontier rather than always refining the single best one (Agrawal et al., 2025, arXiv:2507.19457). The adaptation is conservative on purpose — propose-only, description-only, and capped — because a Skill description is load-bearing context that every future session pays for.

## Process

1. **Collect routing evidence.** Load the target skill and its fixture set from `evaluate-skill` (`scenarios/` for route behavior). Record which fixtures expect this skill to fire and which expect it to stay silent. A fixture set with fewer than five fixtures cannot hold out evidence; report that and stop.
2. **Split the fixture set 60/40.** Deterministically assign 60% of fixtures to the train split (used for reflection) and 40% to the held-out split (used only for scoring candidates). Held-out fixtures are never shown to the reflection step.
3. **Score the baseline.** Run the current description against every fixture in both splits, recording one evaluation row per fixture with its (skill, version, fixture) triple, score, and textual feedback.
4. **Reflect and propose.** Read the failing train rows, attribute each failure to a missing or misleading trigger phrase in the description, and write one candidate description that addresses them. Prefer sharpening an existing trigger over adding a new one: every added phrase is permanent context load.
5. **Score the candidate.** Run the candidate against every held-out fixture. Score both splits; the decision is made on held-out scores only.
6. **Select from the frontier.** Keep every candidate that is best on at least one held-out fixture (the Pareto frontier) instead of only the global best, so complementary strategies survive. Iterate within `maxIterations`, then emit the proposal or the no-defensible-change verdict.

## The 60/40 split

- Rule: train fixtures drive reflection; held-out fixtures decide acceptance. A candidate that only improves on train fixtures is reported as `tie`, not `accept`.
- Rule: the split is deterministic and stable for a given fixture set, so two runs over the same fixtures produce the same split and comparable scores.
- Rule: fixtures are never promoted from held-out to train mid-run; that turns held-out evidence into training data.

## The capacity cap

- Rule: 1024 characters is a hard cap on the proposed description, aligned with the portable-skill description limit. A candidate at 1025 characters is rejected, never trimmed silently.
- Rule: the cap is a ceiling, not a target. The default is to shorten: a description that routes correctly in fewer characters wins over an equivalent one that spends more context on every future turn.

## Recording evidence

Every evaluation row in the proposal is a (skill, version, fixture) triple plus the description that was scored:

| Column | Why it is mandatory |
|---|---|
| `skill` | Which skill the evidence belongs to, so proposals are never cross-attributed |
| `version` | Which version was measured, because a proposal against a stale version is not actionable |
| `fixture` | Which fixture produced the score, so a routing regression can be replayed |
| `score` + `feedback` | The number and the textual reason, because feedback is what the next reflection reads |

A reflection step shown only a scalar score loses the failure mode it is meant to fix, so a float-only metric degrades this loop to guesswork (Agrawal et al., 2025, arXiv:2507.19457, §3).

## Refusal boundaries

- Rule: with fewer than five fixtures, or an empty held-out split, report that no defensible claim is possible instead of proposing on train evidence alone.
- Rule: when the candidate and the baseline tie on held-out scores, keep the baseline — a description rewrite that changes nothing but words is churn the author pays for.
- Rule: when every frontier candidate is rejected, the verdict is the finding; a proposal is never padded to look like progress.

## References

- `references/gepa-protocol.md` — the adapted GEPA loop, the acceptance rule, and the research basis.

## Completion

- the skill's completion criteria are explicitly checked
- the proposal is returned and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml
