---
name: "spec-driven-development"
category: "project"
maturity: "experimental"
version: "1"
description: "Run spec-driven development (SDD): a constitution for repo-local rules, then specify, plan, and tasks as durable artifacts, then implement against them - compatible with GitHub Spec Kit's /specify, /plan, /tasks workflow."
license: "MIT"
capabilities:
  - author and maintain a repository constitution
  - produce a spec artifact from intent (specify phase)
  - produce a plan artifact with architecture and seams (plan phase)
  - decompose the plan into tracer-bullet tasks (tasks phase)
  - verify implementation against the spec and plan
inputs:
  - the user's intent for a feature or change
  - the repository constitution (or the intent to create one)
  - the existing stack, tracker, and validation commands
outputs:
  - type: object
    name: SpecDrivenArtifacts
  properties:
    status: { type: string, enum: [specified, planned, tasked, implemented, blocked] }
    constitution: { type: "string" }
    spec: { type: "string" }
    plan: { type: "string" }
    tasks: { type: "array", items: { type: "string" } }
    verification: { type: "object" }
    nextConsumer: { type: "string" }
    riskRemaining: { type: "string" }
  required: [status, nextConsumer]
sideEffects:
  - write-docs
  - write-files
dependencies:
  - to-spec
  - to-tickets
  - grill-with-docs
  - implement
  - analyze-artifacts
  - docs-adrs
stopCondition: "Constitution, spec, plan, and tasks exist as durable artifacts and the implementation verifies against them."
risk: "medium"
trustTier: "3"
maxIterations: "12"
promptVersion: "1.0"
artifactType: "spec-driven-artifacts"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: .agents/skills/platform/fixtures/behavioral/spec-driven-development.json
diataxis: "how-to"
tags: ["spec-driven", "sdd", "spec-kit", "constitution", "planning"]
compatibility:
  - claude-code
  - codex
  - opencode
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: user intent, plus the repository constitution (or the intent to create one).
- Output: `SpecDrivenArtifacts` covering constitution, spec, plan, tasks, and verification.
- Scope: SDD is the planning spine. Implementation belongs to `implement`; this skill produces the artifacts implementation is held against.
- Rule: no phase starts until the previous artifact is durable. Ambiguity is resolved with `grill-with-docs`, not guessed.

## The constitution

The constitution is the repo-local rule set SDD enforces: architecture invariants, stack constraints, quality bar, validation commands, and the non-negotiables (security, privacy, accessibility). It lives at `docs/spec/constitution.md` and is versioned like code. Create it once with `grill-with-docs`; every spec and plan is checked against it.

## Phases

1. **Specify** (`/specify` compatible). Turn intent into a spec: problem, goals, user stories, acceptance criteria, explicit non-goals. The spec is the source of truth; the plan and tasks must trace to it.
2. **Plan** (`/plan` compatible). Architecture and seams: components, data flow, the public API seam, trade-offs as ADR candidates, and the validation strategy. Every decision traces to a constitution rule.
3. **Tasks** (`/tasks` compatible). Decompose the plan into tracer-bullet tasks: narrow, complete paths through behavior, validation, and delivery. Each task names its spec clause and its acceptance evidence. In the quirk flow this phase is `to-spec` followed by `to-tickets`; the SDD artifacts carry the same contracts.
4. **Implement.** Hand the tasks to `implement`; each slice validates against its acceptance criteria.
5. **Verify.** Run `analyze-artifacts` to confirm spec, plan, tasks, and implementation still agree. Divergence is a finding, not a footnote.

## Provenance

| Question | Answer |
|---|---|
| What is the source of truth? | User intent, the repository constitution, and the existing stack and tracker |
| What is in scope? | Constitution, specify, plan, tasks, implement handoff, verify |
| What is explicitly out of scope? | Implementation itself, which belongs to `implement` against these artifacts |
| Who or what consumes this artifact afterward? | `implement` for each task slice, then `analyze-artifacts` for verification |
| What evidence proves it is done? | SpecDrivenArtifacts with constitution, spec, plan, tasks, and verification |
| What risk remains? | Tasks that trace to no spec clause; a plan without declared seams |

## Artifact

`SpecDrivenArtifacts` with `status`, `constitution`, `spec`, `plan`, `tasks`, `verification`, `nextConsumer`, and `riskRemaining`.

## Reference

- The canonical prompt for this skill is versioned at `.agents/skills/prompts/spec-driven-development/v1.md` (prompt version 1.0).
- Governing skills: see the dependencies in the frontmatter for the skills this one composes with.

Every execution is traced via `record-execution.mjs`. The trace includes traceId, spanId, model tier, duration, tool calls, and quality score.

## Rationale

Vibe coding produces implementations no artifact can be held against. A constitution plus durable specify/plan/tasks artifacts gives every implementation a source of truth to trace to, which is what makes review and repair possible instead of ornamental.

## Completion

- The constitution exists and the spec, plan, and tasks trace to it.
- Every task names the spec clause it implements and the evidence that proves it.
- `analyze-artifacts` reports no unresolved divergence.
- No approval is required for SDD artifacts: the constitution, spec, plan, and tasks are repo-local documentation files, reversible via git.

## Failure modes

- Spec without a constitution: the plan has no rule set to be checked against; write the constitution first.
- Tasks without spec clauses: a task that traces to nothing is scope creep in waiting.
- Plan without seams: an implementation without a declared public seam cannot be reviewed against the plan.

---
@include .agents/skills/platform/contract-base.xml
