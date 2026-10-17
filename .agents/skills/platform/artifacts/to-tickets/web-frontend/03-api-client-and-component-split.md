# Add the typed API client and TanStack Query, and split ExplorationDashboard into feature components

**Issue:** #35

**Owner:** MateoDG2006
**Parent spec:** #32
**Labels:** `ready-for-agent`
**Metadata**

- Project: none
- Milestone: none
- Fields: `work_type` = Ticket; `repo_scope` = web; `phase` = build; `priority` = high; `risk` = medium; `sprint` = hackathon  ; `release_train` = none
- Todo: none
**Docs:** [Architecture: API client](https://github.com/HackathonFISC/equipo-02/blob/docs/frontend-spec/docs/reference/frontend/architecture.md#api-client) · [Architecture: state](https://github.com/HackathonFISC/equipo-02/blob/docs/frontend-spec/docs/reference/frontend/architecture.md#state) · [Current state (CS-4)](https://github.com/HackathonFISC/equipo-02/blob/docs/frontend-spec/docs/reference/frontend/current-state.md)

## Context
Prefactor slice. `ExplorationDashboard.tsx` is 712 lines with 20 `useState` and four hand-rolled fetch flows (CS-4). Introduce the typed client and query layer, and decompose the component without changing behavior, so the candidate views can reuse the parts.

## Acceptance Criteria
- [ ] `apps/web/lib/api/client.ts` exposes typed functions for every existing `/api/*` route using the package contracts (`IntakeResult`, `ExplorationResult`, `Roadmap`, `SavedSearchView`, `CandidatePreferences`).
- [ ] API failures are normalised to `ApiError { status, code, details?, message }` in `lib/api/errors.ts`.
- [ ] TanStack Query v5 is installed with a `QueryProvider` in the root layout; queries/mutations live in `lib/queries/*.ts`.
- [ ] `ExplorationDashboard` is split into `PreferencesForm`, `VacancyList`, `NearMatchList`, `DiscardSummary`, `RoadmapList`, and `SavedSearches` under `components/<feature>/`; no component exceeds 250 lines.
- [ ] No client component imports `lib/*-handler.ts`, `lib/*-store.ts`, or `@puente/agent-runtime`; an ESLint `no-restricted-imports` rule enforces it.
- [ ] User-visible behavior of the current page is unchanged.

## Validation
`npm run verify` passes, including the new lint rule. Manual run of the current page: intake, explore, roadmap on no-match, save search, delete data all behave as before.

## Blocked By
- #33 — Adopt Tailwind v4, shadcn/ui, and the design tokens in apps/web

## Risks
Touches the same files as #33; landing after #33 avoids merge conflicts (intentional edge).
