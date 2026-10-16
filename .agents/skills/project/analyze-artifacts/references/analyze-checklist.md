# Analyze Checklist Reference

The checks `analyze-artifacts` applies in step 3 of its process. The checklist is **reviewer-owned**:
it is applied by the analyzer and by anyone reviewing a work item, never by the author of the
artifacts being checked. Each row names the join it guards, the pass condition, and the finding
class emitted when it fails.

## How to apply the checklist

1. Build the requirement index first (one id per requirement across spec, plan, and tickets).
   Without the index, a missing row is invisible — documents compared as whole documents hide
   exactly the drift this checklist exists to catch.
2. Apply every row. A row that cannot be evaluated is an `ambiguity` finding, not a skipped row.
3. Quote the evidence for each failure: the artifact, the section, and the sentence or link.
4. Classify with the table below. One observation yields one finding; note secondary classes in
   the evidence.

## The requirement index

| Check | Pass condition | Class on failure |
|---|---|---|
| `AA-01` stable ids | Every requirement in the spec, the plan, and each ticket has an id that survives across artifacts | `ambiguity` |
| `AA-02` one meaning per id | No id is reused for two different requirements | `conflict` |
| `AA-03` traceable direction | Every ticket's acceptance criteria trace back to a spec id, and every spec id traces forward to at least one ticket | `gap` |

## Join 1: spec against plan

| Check | Pass condition | Class on failure |
|---|---|---|
| `AA-04` scope agreement | Every plan step implements a spec goal or acceptance criterion; no plan step invents scope | `gap` |
| `AA-05` ordering feasibility | The plan's order respects declared blocking edges and dependencies | `conflict` |
| `AA-06` non-goals respected | No plan step contradicts a spec non-goal | `conflict` |
| `AA-07` decision parity | Every decision recorded in the plan traces to a spec decision or is recorded as new with rationale | `ambiguity` |

## Join 2: plan against tickets

| Check | Pass condition | Class on failure |
|---|---|---|
| `AA-08` full coverage | Every plan step has at least one ticket that carries it | `gap` |
| `AA-09` no orphan tickets | Every ticket traces to a plan step; a ticket with no plan step is unscoped work | `gap` |
| `AA-10` blocking edges declared | Each ticket declares its blockers explicitly, and the declared edges match the plan's order | `conflict` |
| `AA-11` acceptance criteria per ticket | Every ticket has independently verifiable acceptance criteria | `ambiguity` |
| `AA-12` seam consistency | Tickets touching one seam name the same seam; two names for one seam is a split requirement | `ambiguity` |

## Join 3: tickets against spec

| Check | Pass condition | Class on failure |
|---|---|---|
| `AA-13` criterion parity | Each spec acceptance criterion is covered by the union of its tickets' criteria, with no weakening (a criterion that becomes "and so on" is weakened) | `gap` |
| `AA-14` scope parity | No ticket widens scope beyond the spec, including "while we're at it" additions | `conflict` |
| `AA-15` definition parity | Terms used in tickets mean what the spec's glossary says they mean | `ambiguity` |

## Reference resolution (dead references)

| Check | Pass condition | Class on failure |
|---|---|---|
| `AA-16` file paths | Every file path named in the artifacts still exists at the stated path | `deadReference` |
| `AA-17` work-item links | Every issue, pull request, and project field link resolves, and the linked item still describes the claimed work | `deadReference` |
| `AA-18` branch and commit links | Every branch or commit named still exists and is the revision the artifact claims | `deadReference` |
| `AA-19` skill and artifact links | Every skill, reference file, or artifact the artifacts name still exists | `deadReference` |
| `AA-20` metadata shape | Labels, milestone, and project fields follow the canonical work-item metadata shape | `conflict` |

## Marker and severity rules

- Rule: a row that fails on ambiguity becomes a `[NEEDS CLARIFICATION]` marker naming the owner and the decision it blocks; the report never settles an ambiguity by guessing.
- Rule: `conflict`, `gap`, and `deadReference` are blockers: the work item's verdict stays `blocked` until the artifacts change.
- Rule: a marker is only cleared by an artifact change that resolves it, recorded in the analysis re-run — not by discussion in a comment thread.
- Rule: when the same root cause explains three findings, report the three findings and name the shared cause once, so nobody fixes the symptom and declares the work item consistent.

## Reviewer-owned boundary

The author of the spec, plan, or tickets does not clear this checklist by editing the checklist.
Findings are repaired in the artifacts, and the repair is verified by re-running the analysis
against the new revisions recorded in `artifactsRead`.
