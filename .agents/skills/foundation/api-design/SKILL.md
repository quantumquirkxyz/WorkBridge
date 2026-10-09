---
name: api-design
category: foundation
maturity: stable
version: 1
description: Design a small, durable API seam — with a deep backend and explicit caller contract boundaries.
capabilities:
  - apply api design workflow
  - produce api design artifact
  - validate api design completion criteria
outputs:
  - type: object
    description: API design plan with seam proposal and contract guidance
    properties:
      seam:
        type: object
        properties:
          name:
            type: string
          rationale:
            type: string
          callerContract:
            type: object
            properties:
              inputs:
                type: array
                items:
                  type: object
              outputs:
                type: object
              errors:
                type: array
                items:
                  type: string
              versioning:
                type: string
      hiddenInternals:
        type: array
        items:
          type: string
      completionCriteriaMet:
        type: boolean
modelTier: reasoning
promptVersion: "2.0"
artifactType: plan
evaluators:
  - behavioral
  - regression
  - traceability
  - quality-bar
fixturesPath: .agents/skills/platform/fixtures/behavioral/api-design.json
diataxis: how-to
tags: [api, backend, design, contracts]
compatibility: [codebase-design, implement, api-contracts]
approvalRequired: false
approvalFor: []
sideEffects: []
dependencies: []
stopCondition: Design a small, durable API seam complete; artifact saved; completion criteria checked.
risk: low
trustTier: 1
maxIterations: 6
---

## Contract

- **Input:** API brief, backend context, and integration constraints.
- **Output:** an API seam proposal, contract guidance, and error/versioning guidance.
- **Scope:** design the contract, not the full implementation.
- **Rule:** keep the API as small as possible while still supporting the real use case.
- **Rule:** name errors and versioning choices explicitly when they affect callers.
- **Rule:** prefer a contract that can survive backend refactors without churn.
- Rule: validate against the corresponding JSON schema before emitting the artifact.

## Provenance

| Quality-Bar Question | Evidence |
|---|---|
| **Intent** | Design a small, durable API seam — with a deep backend and explicit caller contract boundaries. |
| **Input** | API brief, backend context, and integration constraints. |
| **Output** | an API seam proposal, contract guidance, and error/versioning guidance. |
| **Side effects** | none. |
| **Boundaries** | design the contract, not the full implementation. |
| **Completion criteria** | API seam is named; caller contract is explicit; error and versioning approach is named. |

## Artifact

This skill emits a structured API design plan (JSON) and a Markdown design document. The JSON is the machine-readable contract proposal; the Markdown is the human-readable design document. Both are emitted together so callers can verify the contract against the prose.

# API Design

Use this skill when the backend needs a stable public contract. It should decide what the caller must know, what stays behind the seam, and how the contract handles errors, versioning, and evolution.

## Steps

1. Identify the caller's core job.
2. Choose the smallest seam that supports that job.
3. Define success, failure, and evolution behavior.
4. Describe what remains hidden behind the API.

## Completion criteria

- the API seam is named
- the caller contract is explicit
- the error and versioning approach is named

---
@include .agents/skills/platform/contract-base.xml
