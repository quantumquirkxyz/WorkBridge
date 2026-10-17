# Expose solver match decisions and show the readiness bar on vacancy cards and detail

**Issue:** #45

**Owner:** MateoDG2006
**Parent spec:** #32
**Labels:** `ready-for-agent`
**Metadata**

- Project: none
- Milestone: none
- Fields: `work_type` = Ticket; `repo_scope` = web; `phase` = build; `priority` = high; `risk` = high; `sprint` = hackathon  ; `release_train` = none
- Todo: none
**Docs:** [OQ-1 decision](https://github.com/HackathonFISC/equipo-02/blob/docs/frontend-spec/docs/reference/frontend/open-questions.md#oq-1--readiness-source) · [Screen S4](https://github.com/HackathonFISC/equipo-02/blob/docs/frontend-spec/docs/reference/frontend/screens.md#s4--detalle-de-vacante-sheet--panel) · [ReadinessBar](https://github.com/HackathonFISC/equipo-02/blob/docs/frontend-spec/docs/reference/frontend/design-system.md#variants-cva)

## Context
OQ-1 decision: readiness comes from the solver (`MatchingService` in `apps/agent-runtime/src/matching/service.ts`, #20), the same `MatchDecision` application drafts need (R13). The exploration `matchScore` is never shown as readiness.

## Acceptance Criteria
- [ ] `POST /api/match` returns `MatchDecision`s for the current candidate and a list of vacancy ids, using `MatchingService.evaluateMatch` with the stored profile and preferences.
- [ ] Decisions are cached per (candidate, vacancy, preferences version) and invalidated when preferences change.
- [ ] Each `VacancyCard` shows "Preparación N%" from `MatchDecision.score` with a `Progress` that has `aria-valuenow` and visible text (AC-18, AC-19, D4).
- [ ] Cards show at most two "Te falta:" items derived from failed constraints and breakdown reasons; the detail shows "Lo que ya tienes" and "Lo que te falta" in full (AC-20).
- [ ] Cards are ordered by readiness score descending once decisions load (AC-17); while loading, the bar is a skeleton and no other score is shown.

## Validation
Handler tests for `/api/match` with fixture profile and vacancies (apt, apt with gaps, not currently apt). Component test for ordering and the skeleton state. e2e: readiness visible on all device profiles.

## Blocked By
- #41 — Build the candidate shell and the Vacantes view with vacancy cards and the detail sheet

## Risks
Per-vacancy geocoding latency (R1); fetch decisions in parallel after the list renders.
