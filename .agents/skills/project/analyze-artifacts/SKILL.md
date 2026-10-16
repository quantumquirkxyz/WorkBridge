---
name: "analyze-artifacts"
category: "project"
maturity: "experimental"
version: "1"
description: "Analyze the spec, plan, and ticket artifacts of one work item for consistency: conflicts, gaps, ambiguities, and dead references, each marked [NEEDS CLARIFICATION] when the artifacts cannot resolve it. Use when a spec and its tickets drifted apart, before to-tickets slices work, or when review-pr needs a spec-side verdict. Never edits the artifacts it reads."
license: "MIT"
capabilities:
  - index requirements across spec plan and ticket artifacts
  - classify consistency findings by evidence
  - emit a read-only artifact consistency report
inputs:
  - the spec artifact of one work item
  - the plan artifact for that work item
  - the ticket set sliced from the plan
  - the canonical work-item metadata of the work item
outputs:
  - type: object
    description: Read-only artifact consistency report with classified findings and clarification markers
    properties:
      workItem:
        type: string
      artifactsRead:
        type: array
        items:
          type: string
      findings:
        type: array
        items:
          type: object
          properties:
            id:
              type: string
            class:
              type: string
            severity:
              type: string
            artifacts:
              type: array
              items:
                type: string
            requirement:
              type: string
            evidence:
              type: string
            clarification:
              type: string
            owner:
              type: string
      verdict:
        type: string
sideEffects: []
dependencies: []
stopCondition: "Artifact consistency analysis complete; every finding classified with evidence; clarification markers carry an owner; report returned read-only; completion criteria checked."
risk: "low"
trustTier: "2"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "project"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ""
diataxis: "how-to"
tags: ["project", "analysis", "requirements", "consistency"]
compatibility: ["to-spec", "to-tickets", "review-pr"]
approvalRequired: "false"
approvalFor: []
clauses:
  - id: ANALYZE-ARTIFACTS-1
    text: "Never edit, fix, close, or republish any artifact the analysis reads; the report is the only output."
    check: "evals/behavioral/analyze-artifacts.json#ANALYZE-ARTIFACTS-1"
  - id: ANALYZE-ARTIFACTS-2
    text: "Never report a finding without the artifact quote or link that proves it, because an unsourced consistency claim is an opinion."
    check: "evals/behavioral/analyze-artifacts.json#ANALYZE-ARTIFACTS-2"
  - id: ANALYZE-ARTIFACTS-3
    text: "Never resolve an ambiguity by guessing the intended requirement; mark it [NEEDS CLARIFICATION] with the owner and the decision it blocks."
    check: "evals/behavioral/analyze-artifacts.json#ANALYZE-ARTIFACTS-3"
reloadPolicy: on-trigger
---

## Contract

- Input: the spec artifact, the plan artifact, the ticket set, and the work-item metadata of one work item.
- Output: `AnalyzeArtifactsReport` — every consistency finding classified as conflict, gap, ambiguity, or dead reference, with evidence and an owner for each unresolved item.
- Scope: read-only comparison of artifacts that already exist. No repair, no re-planning, no re-ticketing.
- Rule: every finding cites the artifacts it compares, so a reader can replay the comparison without re-running the analysis.
- Rule: an ambiguity the artifacts cannot settle becomes a `[NEEDS CLARIFICATION]` marker with a named owner and the decision it blocks, never a silent interpretation.
- Rule: the canonical work-item metadata shape in [`docs/reference/agents/work-item-format.md`](../../../../docs/reference/agents/work-item-format.md) is the reference for labels, milestone, and field semantics when reading a work item.

## Guardrails

- Never edit, fix, close, or republish any artifact the analysis reads; the report is the only output.
- Never report a finding without the artifact quote or link that proves it, because an unsourced consistency claim is an opinion.
- Never resolve an ambiguity by guessing the intended requirement.
- Never widen a single work item's analysis into a bundle-wide audit; scope creep here produces a report nobody can act on.

## Provenance

| Question | Answer |
|---|---|
| What is the source of truth? | The work item's published artifacts: spec issue or spec artifact, plan, tickets, and tracker metadata |
| What is in scope? | Consistency of that one work item's artifacts against each other and against the canonical metadata shape |
| What is explicitly out of scope? | Code correctness, implementation quality, and any change to the artifacts themselves |
| Who or what consumes this artifact afterward? | The work-item owner or `review-pr`, which needs a spec-side verdict before approving |
| What evidence proves it is done? | Each finding carries its class, the artifacts compared, and the quoted evidence; unresolved items carry an owner |
| What risk remains? | Artifacts too vague to classify, and findings whose owner is a team rather than a person |

## Artifact

Return `AnalyzeArtifactsReport` as structured output in the current response. Do not write local artifact files, and never edit the analyzed artifacts, unless the user explicitly asks for an export.

| Field | Meaning |
|---|---|
| `workItem` | The work item identifier the analysis covers |
| `artifactsRead` | Every artifact the analysis actually read, with its revision or link |
| `findings` | One entry per finding: id, class, severity, artifacts compared, requirement, evidence, clarification marker, owner |
| `verdict` | `consistent`, `needs-clarification`, or `blocked`, with the count of findings behind it |

## Why

A work item decays between artifacts. The spec says one thing, the plan sequences another, and the tickets that finally reach an implementation describe a third. Each artifact was correct when written; the drift happens in the joins, and the joins are exactly what no single artifact owns.

`to-tickets` slices a plan into tickets and `to-spec` publishes the boundary, but nothing measures the joins afterwards. This skill is that measurement: a read-only comparison that names where the artifacts disagree, where a requirement has no downstream home, where a sentence admits two readings, and where an artifact points at something that no longer exists. Reporting is the whole job, which is why the analysis never touches what it reads.

## Process

1. **Load the artifact set.** Read the spec artifact, the plan, every ticket sliced from it, and the work-item metadata. Record each artifact's revision or link in `artifactsRead` so the report states exactly what was compared. When an artifact cannot be read at all, that is a dead reference, not a skipped step.
2. **Index the requirements.** Give every requirement a stable id: acceptance criteria from the spec, steps from the plan, and acceptance criteria from each ticket. The index is what makes a missing row visible — a requirement that exists in one artifact and in no other is a gap by construction.
3. **Cross-check the joins.** Compare spec against plan, plan against tickets, and tickets against spec, using the checklist in [`references/analyze-checklist.md`](references/analyze-checklist.md). Compare requirement by requirement, not document by document.
4. **Resolve every reference.** Follow each file path, issue, pull request, branch, skill, and artifact link the artifacts name and confirm it still exists and still means what the artifact claims.
5. **Classify each finding.** Assign one of the four classes below with its evidence, then mark the finding `[NEEDS CLARIFICATION]` when the artifacts alone cannot settle it, naming the owner and the decision it blocks.
6. **Emit the report.** Return the findings ordered by severity, then state the verdict. The verdict reflects the artifacts, not the implementation.

## Finding classes

| Class | Definition | Example | Severity |
|---|---|---|---|
| `conflict` | Two artifacts assert incompatible things about the same requirement | The spec lists a criterion as in scope; a ticket marks it out of scope | blocker |
| `gap` | A requirement exists in one artifact and has no counterpart in the artifact that must carry it | An acceptance criterion with no ticket that implements it | blocker |
| `ambiguity` | A requirement admits more than one reading and no artifact disambiguates | "Responses stay fast" with no latency budget anywhere | clarification |
| `deadReference` | An artifact points at something that no longer exists | A ticket linked to a closed issue, a deleted branch, or a moved file | blocker |

- Rule: a finding's severity is a property of the evidence, not of how loudly it is reported. Lowering a severity requires new evidence, not a negotiation.
- Rule: when one observation fits two classes, record the stronger class and note the second in the evidence, so a gap hiding inside an ambiguity is not lost.

## Clarification markers

- Rule: a finding becomes a `[NEEDS CLARIFICATION]` marker when resolving it needs a decision the artifacts do not contain. The marker names the owner (a person or a role) and the decision it blocks — "someone should decide" is not an owner.
- Rule: a blocked marker keeps the work item's verdict at `needs-clarification` or `blocked`; the report never averages away an unresolved requirement.
- Rule: markers are phrased as questions with a decision attached, so the owner can answer without re-deriving the context.

## References

- `references/analyze-checklist.md` — the reviewer-owned checks applied in step 3, one row per join.
- [`../../project/to-spec/references/spec-checklist.md`](../to-spec/references/spec-checklist.md) — the reviewer-owned requirement tests a spec must satisfy before tickets exist.

## Completion

- the skill's completion criteria are explicitly checked
- the report is returned and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml
