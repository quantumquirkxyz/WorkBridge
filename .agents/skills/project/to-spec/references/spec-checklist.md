# Spec Checklist Reference

The **unit tests for requirements**. Each acceptance criterion in a spec is a test: it has a pass
condition, and it passes or fails on evidence, not on wording. This checklist is **reviewer-owned** —
the spec author runs it before publishing, and the reviewer (`review-pr`, `analyze-artifacts`) re-runs
it afterwards. An author never clears a failing row by editing the checklist.

Use it together with [`spec-template.md`](spec-template.md): the template fixes the shape of the spec,
this checklist decides whether its requirements are testable.

## How to run it

1. Take each acceptance criterion in isolation and apply `SC-01` through `SC-08`. A criterion that
   fails any row is not publishable as written.
2. Apply `SC-09` through `SC-14` to the spec as a whole.
3. For every requirement that cannot be made testable from what is already known, emit a
   `[NEEDS CLARIFICATION]` marker per the marker rules below instead of shipping an untestable
   criterion or a placeholder.
4. Record the run: which criteria were checked, which failed, and which markers were emitted.

## Per-criterion tests

| Test | Pass condition | Fail looks like |
|---|---|---|
| `SC-01` independently verifiable | One reader can decide pass or fail without asking the author | "works correctly", "is robust", "handles errors" |
| `SC-02` atomic | The criterion asserts one thing; splitting it would not lose meaning | "validates input, retries, and logs the failure" |
| `SC-03` observable | The pass condition is stated in terms of behavior an operator can trigger | "the cache layer is coherent" |
| `SC-04` bounded | The criterion names its boundary: input domain, limit, or explicit out-of-scope | "fast responses" with no budget |
| `SC-05` traceable | The criterion traces to a stated goal, and the goal to the problem statement | a criterion that serves no goal |
| `SC-06` unambiguous | Two readers reading the criterion intend the same behavior | "users can manage their data" |
| `SC-07` non-placeholder | The criterion contains no `TBD`, no filler, and no implied scope | "and so on", "etc.", "TBD" |
| `SC-08` term-consistent | Every term means what the project glossary says it means | "context" used for two different things |

## Whole-spec tests

| Test | Pass condition | Fail looks like |
|---|---|---|
| `SC-09` goal/non-goal coverage | Every goal has at least one criterion; every non-goal is excluded by at least one criterion | a goal nobody can test |
| `SC-10` seam choice explicit | The spec names the seam it will be tested at and why, preferring an existing seam | a feature described with no seam |
| `SC-11` decisions justified | Every decision carries its rationale, including the alternatives rejected | "we chose X" |
| `SC-12` risks owned | Every risk names a mitigation or an owner | a risk list with no owners |
| `SC-13` ticket-ready | Each criterion can be sliced into tracer-bullet work without re-deriving intent | a criterion only its author can decompose |
| `SC-14` vocabulary aligned | The spec uses this repo's vocabulary: context, harness, loop, graph, data plane, execution plane, observability, safety boundaries | imported vocabulary from an unrelated project |

## The [NEEDS CLARIFICATION] marker

A requirement that cannot be made testable from what is already known is published with a marker
rather than being guessed at or left as a placeholder:

- Syntax: `[NEEDS CLARIFICATION] <question>` appended to the criterion, followed by the owner and
  the decision it blocks, for example:
  `Acceptance: p95 search latency stays under 300ms [NEEDS CLARIFICATION] owner: search-team; blocks: ticket "search-latency-budget"`.
- Rule: a marker names a person or a role. "Later", "backlog", and "someone" are not owners.
- Rule: a marker states the decision it blocks, so the owner answers a question instead of
  re-deriving the context.
- Rule: a spec published with an open marker is not ticket-ready. `to-tickets` must not slice a
  marked requirement into work, because the ticket would inherit an untestable criterion.
- Rule: a marker is cleared only by the owner's answer recorded in the spec, never by removing the
  marker to make the spec look complete.
- Rule: markers are counted, not hidden. The spec's `validationNotes` records how many markers were
  published and which requirements carry them.

## Reviewer-owned boundary

The spec author runs this checklist before publishing; the reviewer runs it again on the published
spec. A row the author skipped is a review finding, and a checklist edit made to turn a failing row
green is itself a finding.
