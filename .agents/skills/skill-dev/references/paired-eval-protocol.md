# Paired Eval Protocol

The full behavioural protocol referenced by [`../evaluate-skill/SKILL.md`](../evaluate-skill/SKILL.md)
and by [`evals/README.md`](../../../../evals/README.md). It applies to any skill that claims to
change agent behaviour, not only to the ten routing pilots in `evals/routing/`.

## 1. Isolate every case

- **One fresh isolated session per case.** New process, new context window, no carry-over messages,
  artifacts, or scratch state from an earlier case. A reused session imports the previous task's
  context and quietly makes one arm look better than it is.
- **Pin the model snapshot.** Both arms run on the same provider, model identifier, and snapshot.
  A delta measured across two models is a model comparison, not a skill effect.
- **Author in one session, record in another.** Authoring context masks gaps: if you generate the
  case in the session where you are writing the skill, the agent effectively already has the skill
  in context, so the "without skill" arm stops being a baseline.

## 2. Run both arms

| Arm | Condition |
|---|---|
| `with-skill` | the skill is loaded (named in the prompt or loaded by the harness) |
| `baseline` | `without-skill`: same task, same model, no skill text anywhere in context |

Record both arms as JSONL transcripts (format in `evals/README.md`), including tokens, duration,
and cost in the `end` event. The runner never calls a model; the agent harness records, the runner
scores.

## 3. Trials

- **At least 3 trials per arm**, and prefer 5 for skills with multi-step workflows.
- Trials are the unit of `pass^k`, so a single trial cannot produce a reliability claim.

## 4. Held-out split for description tuning

- Split the prompt set into a **tuning** split and a **held-out** split before you touch a
  description.
- Tune on the tuning split only. Report trigger rate, false-positive rate, and every behavioural
  delta **on the held-out split**.
- Retuning the description after looking at held-out results and reporting those same numbers is
  leakage; re-split and re-record instead.

## 5. Analyst pass — find the non-discriminating assertions

After a run, before believing it:

- For every assertion, compare its with/baseline delta. An assertion that fails in **both** arms
  (or passes in both) is **non-discriminating**: it measures the model, not the skill. It stays in
  the suite as a regression guard only if it also earns its judge budget; otherwise demote or drop
  it, because it dilutes the signal of everything around it.
- For every judge criterion, check the evidence spans. A criterion whose pass rate swings wildly
  between the arms while the underlying defect is identical is suspected of **style bias**
  (arXiv 2604.23178 reports style bias of 0.10–0.76, dominant over position bias). Prefer
  rewriting the rubric element over changing the judge.
- Re-check any rubric element the judge failed on two adjacent runs with the same artifact: that
  is flaky phrasing, not a model problem.

## 6. Record the triple

Record `(skill, version, fixture)` with every result (arXiv 2609.17394): the skill name, the skill
version under test, and the fixture file that produced the prompts and rubric. Without the triple a
result cannot be replayed once the skill moves, and a delta measured across two versions is
uninterpretable.

## 7. Deterministic first, judge second

- Deterministic assertions run locally with no API key and are the only ones CI can rely on.
- Judge assertions run through the interface in `evals/judge/grader.md`, **one criterion per
  call**, with `{text, passed, evidence}` returned each time.
- A judge must clear its calibration gate (30–50 human-labelled items, TPR >= 0.90,
  TNR >= 0.90, Cohen's kappa >= 0.6) before its numbers are used for a promotion decision, and
  those numbers belong to the pinned snapshot in `evals/judge/judge.config.json` only.

## 8. Evaluate the skill, not the skill's documentation

A green structural gate means the documentation is shaped correctly. A behavioural claim — routing
accuracy, artifact quality, cost — requires a paired run with recorded transcripts. Keep the two
kinds of statement apart in every report: "documentation fixtures pass" and "the skill improves
outcomes" are different sentences with different evidence.
