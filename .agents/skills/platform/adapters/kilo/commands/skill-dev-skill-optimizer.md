---
description: "Optimize a quirk Skill's model-facing description against routing fixtures with a propose-only reflective loop. Use when a Skill routes wrong, fires too rarely or too often, or when evaluate-skill or skill-quality-gate reports a routing regression. Emits a diff-shaped proposal with (skill, version, fixture) evidence; the human applies it. Not for body edits or metadata repair."
---
# skill-optimizer

When to use: Optimize a quirk Skill's model-facing description against routing fixtures with a propose-only reflective loop. Use when a Skill routes wrong, fires too rarely or too often, or when evaluate-skill or skill-quality-gate reports a routing regression. Emits a diff-shaped proposal with (skill, version, fixture) evidence; the human applies it. Not for body edits or metadata repair.

## Workflow

1. **Collect routing evidence.** Load the target skill and its fixture set from `evaluate-skill` (`scenarios/` for route behavior). Record which fixtures expect this skill to fire and which expect it to stay silent. A fixture set with fewer...
2. **Split the fixture set 60/40.** Deterministically assign 60% of fixtures to the train split (used for reflection) and 40% to the held-out split (used only for scoring candidates). Held-out fixtures are never shown to the reflection step
3. **Score the baseline.** Run the current description against every fixture in both splits, recording one evaluation row per fixture with its (skill, version, fixture) triple, score, and textual feedback
4. **Reflect and propose.** Read the failing train rows, attribute each failure to a missing or misleading trigger phrase in the description, and write one candidate description that addresses them. Prefer sharpening an existing trigger ove...
5. **Score the candidate.** Run the candidate against every held-out fixture. Score both splits; the decision is made on held-out scores only
6. **Select from the frontier.** Keep every candidate that is best on at least one held-out fixture (the Pareto frontier) instead of only the global best, so complementary strategies survive. Iterate within `maxIterations`, then emit the pr...

## Deliverables

- skill-dev artifact

## Guardrails

- risk: low; trust tier: 2; approval required: no
- side effects: none
- isolation: none; model tier: reasoning

Stop when: Skill description optimization proposal emitted with held-out evidence, or an explicit no-defensible-change verdict; target skill untouched; completion criteria checked.
