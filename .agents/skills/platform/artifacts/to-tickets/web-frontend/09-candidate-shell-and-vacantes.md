# Build the candidate shell and the Vacantes view with vacancy cards and the detail sheet

**Issue:** #41

**Owner:** MateoDG2006
**Parent spec:** #32
**Labels:** `ready-for-agent`
**Metadata**

- Project: none
- Milestone: none
- Fields: `work_type` = Ticket; `repo_scope` = web; `phase` = build; `priority` = high; `risk` = medium; `sprint` = hackathon  ; `release_train` = none
- Todo: none
**Docs:** [Screens S3, S4, S13](https://github.com/HackathonFISC/equipo-02/blob/docs/frontend-spec/docs/reference/frontend/screens.md#s3--vacantes-vacantes) · [State matrix](https://github.com/HackathonFISC/equipo-02/blob/docs/frontend-spec/docs/reference/frontend/ux-flows.md#state-matrix) · [Components](https://github.com/HackathonFISC/equipo-02/blob/docs/frontend-spec/docs/reference/frontend/design-system.md#components)

## Context
First candidate surface (G3, G5 navigation). Built from the components split in #35 and the session-backed data from #39. The readiness bar itself lands in "Expose solver match decisions and show the readiness bar on vacancy cards and detail"; this slice renders cards without it.

## Acceptance Criteria
- [ ] Candidate navigation shows "Vacantes", "Mi ruta", "Postulaciones", "Mi perfil": bottom bar below 768 px with safe-area padding, header bar at 768 px and above; hidden on `/`, `/chat`, `/ingresar` (AC-31, AC-52).
- [ ] The active item has `aria-current="page"` and a non-color indicator (AC-32).
- [ ] `/vacantes` lists one `VacancyCard` per match with title, company or "Empresa no indicada", modality, location, salary range or "Salario no publicado", and freshness (AC-18 minus the bar).
- [ ] Activating a card sets `?v=<jobId>` and opens `VacancyDetail` as a bottom sheet below 768 px and a right panel at 768 px and above; loading the URL directly opens it; closing restores focus to the card (AC-21, AC-22).
- [ ] The detail links "Ver vacante original" to `provenance.sourceUrl` in a new tab with `rel="noreferrer"` and a visually hidden "(se abre en otra pestaña)" (AC-23).
- [ ] Near matches render under "Casi listas para ti" with the blocking constraint in one sentence (AC-24).
- [ ] Excluded vacancies render as one line with the count and top three causes (AC-25).
- [ ] Loading shows three skeleton cards (AC-26); an unknown `?v=` shows the toast "Esa vacante ya no está disponible" and removes the param.
- [ ] Touch targets are at least 44 × 44 px (AC-51).

## Validation
Component tests for `VacancyList` and the sheet (MSW). e2e on the three device profiles: open a vacancy, deep link `?v=`, close with Esc; axe and no-horizontal-scroll helpers from #36 pass.

## Blocked By
- #35 — Add the typed API client and TanStack Query, and split ExplorationDashboard into feature components
- #39 — Derive the candidate id from the session and persist profile, preferences, and saved searches with read and delete endpoints
