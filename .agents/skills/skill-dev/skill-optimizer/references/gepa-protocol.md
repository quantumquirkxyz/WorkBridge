# GEPA Protocol (adapted for description optimization)

This reference defines the reflective-evolution loop `skill-optimizer` runs, the deterministic
acceptance rule, and the research basis for each design decision. It is the protocol behind the
proposal; `SKILL.md` holds the workflow.

## Research basis

| Source | What it contributes |
|---|---|
| Agrawal, Tan, Soylu, Ziems, Khare, et al. (2025), *GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning*, arXiv:2507.19457 | The core loop: reflective prompt mutation driven by execution traces, and Pareto-frontier candidate selection instead of greedy best-only refinement |
| `gepa-ai/gepa` (https://github.com/gepa-ai/gepa) | Reference implementation of the candidate pool, ancestry records, and validation-set selection |
| DSPy GEPA documentation (https://dspy.ai/api/optimizers/GEPA/overview/) | Operational shape: `trainset` drives reflective updates, `valset` tracks Pareto scores and picks the returned candidate; the metric returns `Prediction(score, feedback)` |

Headline numbers from the paper, for calibration only — they are GEPA's benchmarks, not this
skill's: GEPA outperformed GRPO by 6% on average and up to 20% while using up to 35x fewer
rollouts, outperformed MIPROv2 by over 10%, and reached GRPO's best validation with up to 78x
greater sample efficiency (arXiv:2507.19457, Observation 1).

## The loop

GEPA's algorithm, mapped onto a Skill description:

1. **Candidate pool.** The pool starts with a single candidate: the current description.
2. **Select.** Sample the candidate to mutate from the Pareto frontier — every candidate that is
   best on at least one held-out fixture — with selection probability proportional to how many
   fixtures it wins. Greedy best-only selection traps the loop in a local optimum.
3. **Reflect.** Run the selected candidate on a minibatch of train fixtures, read the failing
   rows with their textual feedback, and attribute each failure to a phrase that is missing,
   misleading, or over-broad.
4. **Propose.** Write one candidate description derived from the selected candidate, carrying the
   lessons forward. The candidate records its ancestry (parent description id).
5. **Score on held-out.** Evaluate the candidate on the held-out split only. Held-out scores decide;
   train scores explain.
6. **Add or discard.** If the candidate improves on held-out fixtures, add it to the pool with its
   ancestry record; otherwise discard it.
7. **Return.** At the budget boundary, return the candidate with the best aggregate held-out score.

## What this bundle changes, and why

| GEPA default | Bundle rule | Reason |
|---|---|---|
| Optimizes any text component of a system | Only the model-facing `description` field | The description is the only always-in-context, routing-load-bearing text; body edits belong to a human author |
| Writes the optimized prompt into the system | Propose-only: emit a diff-shaped proposal | A Skill is version-controlled and reviewed; a silent rewrite bypasses the author |
| `trainset` / `valset` sized per task | Fixed 60/40 deterministic split | Makes the split reproducible and comparable across runs |
| No length limit on the prompt | 1024-character capacity cap | Matches the portable-skill description limit; the description is permanent context load |
| Rollouts recorded as traces | Every score recorded as a (skill, version, fixture) triple | A routing claim must be replayable against the exact skill version and fixture that produced it |
| Budget in rollouts / metric calls | `maxIterations` from the skill frontmatter | Keeps the loop inside the declared loop budget |

## The acceptance rule

A candidate is accepted only when **all** of the following hold. The rule is deterministic and is
implemented in `scripts/proposal-policy.mjs`, so a proposal is never accepted on narrative alone.

1. **Capacity** — the candidate is at most 1024 characters. An oversized candidate is rejected, not
   trimmed, because silent trimming hides the cost the cap exists to expose.
2. **Held-out coverage** — at least one held-out fixture was scored. With an empty held-out split the
   loop reports "no defensible claim" rather than proposing on train evidence.
3. **Mean improvement** — the candidate's mean held-out score is strictly greater than the baseline's.
   A tie is not an improvement.
4. **No held-out regression** — the candidate scores at least the baseline on every individual held-out
   fixture. A candidate that lifts the mean by breaking one route is rejected, because one broken route
   is a user-visible routing failure.

Decision values: `accept` (all four hold), `reject` (capacity, coverage, or regression failure, with
reasons), `tie` (improvement absent, meaning the baseline stands).

## Feedback requirement

The reflection step reads textual feedback, not just a scalar. A metric that returns only a number
gives the proposer a generic "this trajectory scored n" caption and the failure mode never reaches
it; GEPA's feedback channel is what makes reflection specific (arXiv:2507.19457, §3; DSPy GEPA
docs). Every evaluation row therefore carries `feedback` alongside `score`.

## What this protocol is not

- Not a body optimizer. Body structure, rules, and completion criteria stay authored.
- Not a metadata repair tool. `sideEffects`, `risk`, `trustTier`, and lockfile hashes are other
  skills' scope (`side-effect-auditor`, `lockfile-maintenance`).
- Not an auto-apply step. The proposal is reviewed and applied by the skill author.
