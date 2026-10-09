---
name: work-item-router
category: routing
maturity: stable
version: 1
description: Force reading the canonical work-item governance index before routing specs, tickets, project boards, or publication flows.
capabilities:
  - apply work item router workflow
  - produce work item router artifact
  - validate work item router completion criteria
inputs:
  - work item request description
  - request type classification
outputs:
  - type: object
    description: Routing decision artifact identifying downstream skill and governance documents
    properties:
      governanceIndexRead:
        type: boolean
      requestType:
        type: string
        enum: [spec, ticket, spec-audit, ticket-audit, corrective-ticket, project-board, pr-publication, review-fix-plan, closeout]
      downstreamSkill:
        type: string
      requiredMetadataContracts:
        type: array
        items:
          type: string
      notes:
        type: string
      completionCriteriaMet:
        type: boolean
modelTier: router
promptVersion: "2.0"
artifactType: plan
evaluators:
  - behavioral
  - regression
  - traceability
  - quality-bar
fixturesPath: .agents/skills/platform/fixtures/behavioral/work-item-router.json
diataxis: how-to
tags: [routing, governance, work-items, triage]
compatibility: [ask-to, to-spec, to-tickets, make-project]
approvalRequired: false
approvalFor: []
sideEffects: []
dependencies: []
stopCondition: Force reading the canonical work-item governance index before routing specs, tickets, project boards, or publication flows complete; structured result returned; completion criteria checked.
risk: low
trustTier: 1
maxIterations: 6
---

## Contract

- **Input:** a request involving specs, tickets, spec/ticket audits, projects, PR metadata, or review-fix comments.
- **Output:** a routing note that identifies the downstream skill and the relevant governance documents.
- **Scope:** routing only. Do not draft the artifact here.
- **Rule:** always read `docs/agents/index.md` first.
- **Rule:** prefer the canonical work-item format over ad hoc tracker metadata.
- **Rule:** route to the thinnest downstream skill that can finish the work.

## Provenance

| Quality-Bar Question | Evidence |
|---|---|
| **Intent** | Force reading the canonical work-item governance index before routing specs, tickets, project boards, or publication flows. |
| **Input** | a request involving specs, tickets, spec/ticket audits, projects, PR metadata, or review-fix comments. |
| **Output** | a routing note that identifies the downstream skill and the relevant governance documents. |
| **Side effects** | none. |
| **Boundaries** | routing only. Do not draft the artifact here. |
| **Completion criteria** | governance index has been read; downstream skill is named; any required metadata contract is explicit. |

## Artifact

This skill returns a structured routing decision and a human-readable routing note in the current response. Do not write local JSON or Markdown artifact files unless the user explicitly asks for an export.

This skill routes only. It does not create issues, tickets, PRs, or project items.

Every routing decision emits a trace via `record-execution.mjs` with the selected transition and next skill.

For governance index contents, see `references/governance-index.md`.

# Work Item Router

Use this skill before `to-spec`, `to-tickets`, or `make-project` when the task involves tracker metadata, project boards, or publication flow.

## Why

Governance preflight prevents tracker drift by forcing every work-item request to read the canonical index before action. Without this gate, agents invent or drift toward ad-hoc metadata, ignore required fields, and bypass tracker state rules. The index acts as the single source of truth for workflow roles, metadata shape, and triage labels, so reading it first ensures downstream skills produce consistent, mergeable artifacts rather than diverging tracker records.

## Reference

- `references/governance-index.md` — what the governance index contains, how to consume it, and which configuration documents are in scope.

## Workflow

1. Read `docs/agents/index.md`.
2. Identify whether the request is a spec, ticket, spec completion audit, ticket coverage audit, corrective ticket publication, project board, PR publication, review-fix plan, or closeout.
3. Route to the thinnest downstream skill that can finish the work.
4. If metadata is involved, preserve the canonical shape from `docs/agents/work-item-format.md`.
5. Return the routing decision as structured output in the current response; rely on execution traces for auditability.

## Request types

| Type | Typical downstream skill |
|---|---|
| spec | `to-spec` |
| ticket | `to-tickets` |
| spec-audit | `review-pr` |
| ticket-audit | `review-pr` |
| corrective-ticket | `implement-review-fixes` |
| project-board | `make-project` |
| pr-publication | `publish-open-pr` |
| review-fix-plan | `plan-review-fixes` |
| closeout | `ship-subissue` |

## Examples

- User says "draft a spec for the new auth flow" → `requestType: spec`, `downstreamSkill: to-spec`, `requiredMetadataContracts: [work-item-format]`.
- User says "split the approved spec into tickets" → `requestType: ticket`, `downstreamSkill: to-tickets`, `requiredMetadataContracts: [work-item-format]`.
- User says "this PR conflicts, resolve it" → `requestType: pr-publication`, `downstreamSkill: resolving-merge-conflicts`, `requiredMetadataContracts: [work-item-format]`.

## Completion criteria

- the governance index has been read
- the downstream skill is named
- any required metadata contract is explicit
- the routing result is returned and the trace is emitted

---
@include .agents/skills/platform/contract-base.xml
