# Frontend Reference — WorkBridge web (`apps/web`)

Reference set for the redesign of `apps/web`: a mobile-first web app where young people in Panama
build their profile through an LLM-guided chat, explore vacancies with a readiness score, follow a
training route, and prepare applications under human approval — plus the counselor and employer
surfaces those approvals require, all behind Better Auth.

**Reader:** anyone on the team who refines, prototypes, implements, or reviews `apps/web`.
**Reader job:** know what the web app must do, how it looks, how it is built, and which decisions
are still open — without re-deriving them from the conversation that produced them.

**Status:** `Refined — ready for implementation` (revision 5, 2026-10-16). All open
questions in [open-questions.md](open-questions.md) are resolved; ADR-0006 and ADR-0007 remain
`Proposed` until the prototype is reviewed.

## Documents

| Document | Shape | Skill used | Answers |
|---|---|---|---|
| [spec.md](spec.md) | Spec (PRD) | `to-spec` | What we build, for whom, goals, non-goals, acceptance criteria, risks, seams |
| [current-state.md](current-state.md) | Analysis | `improve-codebase-architecture` | What `apps/web` is today and what blocks the redesign |
| [ux-flows.md](ux-flows.md) | Interaction design | `interaction-design` | Journeys J1–J10, chat model and slot agenda, application lifecycle, states, errors |
| [screens.md](screens.md) | Screen spec | `frontend-design` | Every view (candidate, counselor, employer, sign-in) with wireframe, content, components |
| [design-system.md](design-system.md) | Design system | `design-system`, `styling` | Tokens, measured contrast, type, components, variants, theming, voice and tone |
| [architecture.md](architecture.md) | Technical design | `nextjs`, `react`, `state-management` | Routes, server/client split, state, API client, chat endpoint, Better Auth, BFF |
| [accessibility.md](accessibility.md) | Accessibility | `ux-accessibility`, `accessibility-design` | Ranked barriers, rules, and validation tasks |
| [testing.md](testing.md) | Test strategy | `frontend-testing` | Tiers, config changes, AC → test map, LLM eval set, gates |
| [open-questions.md](open-questions.md) | Refinement log | `grill-with-docs` | OQ-1…OQ-11 with options, recommendation, owner, blocked work |

Decisions: [ADR-0006](../../../.agents/adr/0006-guided-chat-intake.md) (LLM-guided chat over a
deterministic slot agenda), [ADR-0007](../../../.agents/adr/0007-web-styling-tailwind-shadcn.md)
(Tailwind v4 + shadcn/ui), and [ADR-0008](../../../.agents/adr/0008-role-organization-authorization.md)
(role and employer-organization authorization). Domain vocabulary: [`CONTEXT.md`](../../../CONTEXT.md). Boundaries:
ADR-0002, ADR-0003, ADR-0004, ADR-0005. Parent spec: `.agents/skills/platform/artifacts/to-spec/workbridge-quantumquirkxyz.md`.
Machine-readable spec: `.agents/skills/platform/artifacts/to-spec/workbridge-web-frontend.json`.
Tracker: spec issue #32; tickets #33–#51 (sub-issues with native blocked-by edges); wave plan in
`.agents/skills/platform/artifacts/to-tickets/web-frontend/tickets.json`.

## Workflow position

```
analysis (done) → spec + design docs (this set) → refinement (open-questions.md)
  → to-tickets (done) → implementation → frontend-testing / code-review
```

## Language convention

Documentation is in English, matching the rest of `docs/` and the `to-spec` rule. **All
user-facing copy is Spanish (es-PA)** and is quoted verbatim in the documents.

## Maintenance

- Owner: frontend lead of `equipo-02` (role). Update this set in the same PR that changes the
  behavior it describes.
- When an open question is answered, record the answer in `open-questions.md`, update the affected
  documents and the spec artifact JSON, and remove the `[NEEDS CLARIFICATION]` marker in the same change.
- Drift risk: `architecture.md` and `ux-flows.md` name API routes, runtime endpoints, and package
  types; re-check them when `@workbridge/catalog`, `@workbridge/training`, `@workbridge/solver`,
  `apps/agent-runtime/src/application/*`, or `apps/web/app/api/*` change.
