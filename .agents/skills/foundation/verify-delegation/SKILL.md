---
name: "verify-delegation"
category: "foundation"
maturity: "experimental"
description: "Blackbox-verify a delegated worker's claim before it is accepted, using the artifact, the declared success criteria, and the tools needed to re-check them - never the worker's implementation narrative."
license: "MIT"
version: "1"
capabilities:
  - decompose delegated work into a canonical delegation brief
  - verify a delegated artifact against its success criteria without implementation context
  - return a bounded DelegationVerdict with evidence, negative tests, and suite status
inputs:
  - delegation brief (objective, outputFormat, toolGuidance, boundaries, stopCondition, effortBudget)
  - artifact or claim produced by the delegated worker
  - success criteria for the delegated objective
  - read-only tool access for re-running the applicable checks
outputs:
  - type: object
    name: DelegationVerdict
    properties:
      briefId: { type: string }
      status: { type: string, enum: [pass, fail, blocked] }
      criteria: { type: array }
      negativeTestsRun: { type: integer }
      fullSuiteRun: { type: boolean }
      artifactMutating: { type: boolean }
      summary: { type: string }
      artifactRef: { type: string }
      tokensUsed: { type: integer }
      durationMs: { type: integer }
    required: [briefId, status, criteria, negativeTestsRun, fullSuiteRun, artifactMutating, summary]
sideEffects:
  - write-temp-file
dependencies:
  - subagent-swarm
stopCondition: "Every declared success criterion is re-checked against the artifact with evidence, negative tests were run, and a bounded DelegationVerdict plus artifact reference is returned to the caller."
risk: "low"
trustTier: "2"
maxIterations: "3"
promptVersion: "2.0"
artifactType: "agent"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ""
diataxis: "how-to"
tags: ["foundation", "delegation", "verification", "subagent"]
compatibility: ["foundation/subagent-swarm", "delivery/code-review"]
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: a `DelegationBrief` (see `.agents/skills/platform/schemas/delegation-brief.schema.json`), the artifact or claim it produced, and the success criteria for its objective.
- Output: `DelegationVerdict` with per-criterion evidence, negative-test count, full-suite status, and a bounded summary. See `references/verify-protocol.md`.
- Scope: verification only. This skill never repairs the artifact it judges and never re-implements the delegated work.
- Rule: the verifier receives the artifact, the success criteria, and the tools to re-check them - and never the worker's implementation context.
- Rule: documented standards override defaults; explicit project rules take precedence.
- Rule: if blocked by missing context or dependencies, surface the blocker before proceeding.

## Provenance

| Question | Answer |
|---|---|
| What is the source of truth? | The artifact under verification and the delegation brief's declared objective and criteria |
| What is in scope? | Re-checking the declared success criteria of one delegated objective against its artifact |
| What is explicitly out of scope? | The worker's reasoning, transcript, or implementation narrative; repairing defects; re-delegating |
| Who or what consumes this artifact afterward? | The delegating orchestrator (e.g. `subagent-swarm`) or `code-review` |
| What evidence proves it is done? | Per-criterion evidence, negative tests run, full-suite status, and a bounded verdict |
| What risk remains? | Criteria that are too weak to detect the failure they name; verifier over-trusting a clean-looking summary |

## Artifact

Emit `DelegationVerdict` as both:
- JSON: `.agents/skills/platform/artifacts/verify-delegation/{id}.json`
- Markdown view: same filename with `.md` extension

Validate the JSON against `.agents/skills/platform/schemas/delegation-brief.schema.json` before returning it.

## Why

Delegation fails at the seam, not in the worker. A brief without boundaries duplicates work; a verdict without evidence is a game of telephone in which each hop rewrites the previous claim. Anthropic's multi-agent research system found that subagent output must reach the filesystem so the caller forwards a bounded summary plus a reference instead of a transcript, and that verification subagents work precisely because they hold the artifact, the success criteria, and the tools - but not the implementation context that would bias them toward agreement. Homogeneous debate is the opposite trade: multi-agent debate costs 2.1-3.4x the tokens for up to 85.5% sycophantic conformity, so one role-diverse reviewer with clean context beats a round-robin of agreeing peers (see `references/verify-protocol.md`).

## Rules

- The verifier gets the artifact, the success criteria, and the tools needed to re-check them. It never gets the implementation context, the worker's plan, or its transcript.
- Negative tests are mandatory: at least one check that must fail before the artifact can be trusted, when the artifact mutates the repository.
- A `pass` verdict requires the full suite to have run. Early victory - declaring success on the first green check - is a defect of the verifier, not a property of the work.
- What returns to the caller is a bounded summary plus an artifact reference. Never a transcript, never a paste of the worker's reasoning.
- Reviewers are role-diverse with clean context. Homogeneous debate (same-role agents arguing in rounds) is prohibited.
- A `readOnly: false` brief requires the invoking skill to declare a mutating side effect; otherwise the brief is rejected before the worker starts.

## Workflow

1. **Receive the brief.** Validate it against `DelegationBrief`. Reject a brief with no `boundaries`, no `stopCondition`, or `readOnly: false` without a declared mutating side effect on the caller.
2. **Split context-centrically.** One artifact, one verifier. Never split one artifact across phases of delegation - that is the documented telephone-game failure.
3. **Scale effort.** Simple objective: one worker, 3-10 tool calls. Comparison: 2-4 workers. Complex: more than 10 tool calls or several independent sources, with an explicit `effortBudget`.
4. **Hand over a clean room.** Give the verifier the artifact, the criteria, and the read-only tools. Withhold the implementation context.
5. **Run the checks.** Re-run each criterion, run the negative tests, then run the full suite.
6. **Emit the verdict.** Write the `DelegationVerdict` artifact, return the bounded summary plus `artifactRef`, and stop.

## Guardrails

- Rule: do not accept a claim whose criteria have no observable check.
- Rule: do not repair, patch, or re-run the worker's implementation to make a criterion pass.
- Rule: do not spawn a debate loop of same-role reviewers to break a tie; spawn one reviewer with a different role and a clean context.
- Rule: stop and report `blocked` when a required tool, source, or suite is unavailable instead of inferring the result.

## Completion criteria

- every declared criterion has evidence, not an assertion
- negative tests were run and the count is recorded
- the full suite ran, or the verdict is `blocked` explaining why it could not
- the verdict is bounded: a summary plus an artifact reference, never a transcript
- the artifact is saved and validated against the schema, and the caller is identified

---
@include .agents/skills/platform/contract-base.xml
