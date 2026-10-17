# Current State of `apps/web` (analysis)

Produced with the `improve-codebase-architecture` skill (analysis only, no rewrites).
Snapshot date: 2026-10-16, commit `04b643a`.

## Inspected

| Area | Files | Notes |
|---|---|---|
| App shell | `app/layout.tsx` (15), `app/page.tsx` (17), `app/globals.css` (182) | One route; plain CSS with 12 custom properties; `system-ui` font; light only |
| Components | `components/IntakeForm.tsx` (300), `components/ExplorationDashboard.tsx` (712) | Both `'use client'`; both own their fetch calls |
| Handlers | `lib/*-handler.ts`, `lib/*-store.ts` | Pure handlers with unit tests; in-memory stores behind interfaces; profile also persisted to Neon |
| API | `app/api/{intake,explore,preferences,roadmap,searches,health/db}/route.ts` | `POST intake`, `POST explore`, `POST/DELETE preferences`, `POST roadmap`, `GET/POST searches` |
| Tests | `apps/web/tests/*-handler.test.ts` | Handler tests only; no component or e2e tests for the web UI |

Heuristic: module depth (interface size vs. responsibility hidden behind it), seam count between
the UI and the domain packages, and visible-behavior defects.

## Confirmed problems

| ID | Problem | Evidence | Impact |
|---|---|---|---|
| CS-1 | Classes `.danger`, `.warning-panel`, `.result` are used but never defined | `ExplorationDashboard.tsx`; absent from `globals.css` | "Eliminar mis datos" renders as a primary blue button next to "Guardar búsqueda" — a destructive action with no visual distinction |
| CS-2 | Intake profile and exploration are disconnected | `ExplorationDashboard` never sends `candidate_id`; `lib/preferences.ts` derives a deterministic id from the declaration | The profile does not inform exploration; the user types target roles twice; profile and preferences live under different candidate ids |
| CS-3 | Aptitude is never shown | `apps/web` does not import `@puente/solver`; `MatchingService` exists in `apps/agent-runtime/src/matching/service.ts` but no web route exposes it | The product's core output (Apt / Apt with gaps / Not currently apt) is invisible |
| CS-4 | `ExplorationDashboard` is shallow and oversized | 712 lines, 20 `useState`, 4 fetch flows, 5 result views in one module | Cannot be split into wizard steps or tested in isolation |
| CS-5 | Internal vocabulary leaks to users | `CandidateProfile`, "trace", "Extractor", "catálogo en caché", raw `jobId` for excluded vacancies, ISO `savedAt` | Confusing for the target audience |
| CS-6 | Wide tables (up to 7 columns) | Matches, excluded, near matches, roadmap | Unusable at phone width |
| CS-7 | "Eliminar mis datos" does not delete the profile | `handleDeleteCandidate` removes preferences and saved searches only; the profile stays in `profileStore` and Neon | The control promises more than it does |
| CS-8 | No read endpoints for returning users | No `GET /api/profile`, no `GET /api/preferences` | A returning visit cannot restore "Mi perfil" |

## Suspected deepening opportunities

- A single typed API client (`lib/api/client.ts`) replacing five hand-rolled `fetch` blocks.
- A candidate-session seam owning `candidateId`, profile, and preferences, so the wizard steps share
  one source of truth (see [architecture.md](architecture.md)).
- Gendered copy ("Dispuesto a…") replaced by neutral first-person copy ("Me interesa…").

## What already works and must be preserved

- Accessible form semantics: labels, `fieldset`/`legend`, `aria-live` status regions, `focus-visible`.
- Pure handlers separated from route files, with tests — the redesign keeps every handler seam.
- No submission path from the web app (ADR-0002 step 6, ADR-0003).

## Evidence gaps

- Runtime behavior with `OPENROUTER_API_KEY` set was not exercised; the analysis is static.
- `apps/agent-runtime` HTTP routes (`/drafts`, `/audit`) were listed but not evaluated for web use.
