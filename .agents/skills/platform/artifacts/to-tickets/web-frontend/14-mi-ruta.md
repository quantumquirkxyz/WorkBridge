# Build the Mi ruta view and the no-match path from Vacantes

**Issue:** #46

**Owner:** MateoDG2006
**Parent spec:** #32
**Labels:** `ready-for-agent`
**Metadata**

- Project: none
- Milestone: none
- Fields: `work_type` = Ticket; `repo_scope` = web; `phase` = build; `priority` = medium; `risk` = low; `sprint` = hackathon  ; `release_train` = none
- Todo: none
**Docs:** [Screens S5, S6](https://github.com/HackathonFISC/equipo-02/blob/docs/frontend-spec/docs/reference/frontend/screens.md#s6--mi-ruta-ruta) · [State matrix](https://github.com/HackathonFISC/equipo-02/blob/docs/frontend-spec/docs/reference/frontend/ux-flows.md#state-matrix)

## Context
G4. Uses the existing `/api/roadmap` composition (ADR-0005) and the advisory roadmap it returns.

## Acceptance Criteria
- [ ] When `noMatch` is present, `/vacantes` shows "Aún no encontramos una vacante para ti", `noMatch.explanation`, the top blocking causes, a primary "Ver mi ruta", and a secondary "Ajustar mis preferencias" (AC-27).
- [ ] `/ruta` lists recommendations as numbered `RoadmapStep`s with title, provider, covered gaps by label, cost ("Gratis" when 0), duration in hours, and `explanationEs` (AC-28).
- [ ] When `willing_to_train` is false, `/ruta` explains why there is no route and offers a toggle that saves the preference and rebuilds the route (AC-29).
- [ ] Unresolved gaps render under "Todavía sin curso disponible" by label (AC-30).

## Validation
Component tests with the no-match fixture; e2e from a no-match exploration to `/ruta`; axe and mobile helpers pass.

## Blocked By
- #41 — Build the candidate shell and the Vacantes view with vacancy cards and the detail sheet
