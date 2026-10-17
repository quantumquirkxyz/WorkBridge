# Build the candidate application flow: prepare, correct, approve, and submit

**Issue:** #51

**Owner:** MateoDG2006
**Parent spec:** #32
**Labels:** `ready-for-agent`
**Metadata**

- Project: none
- Milestone: none
- Fields: `work_type` = Ticket; `repo_scope` = web; `phase` = build; `priority` = high; `risk` = critical; `sprint` = hackathon  ; `release_train` = none
- Todo: none
**Docs:** [Screens S9, S10](https://github.com/HackathonFISC/equipo-02/blob/docs/frontend-spec/docs/reference/frontend/screens.md#s9--postulación-postulacionesid) · [Application status](https://github.com/HackathonFISC/equipo-02/blob/docs/frontend-spec/docs/reference/frontend/ux-flows.md#application-status) · [Error copy](https://github.com/HackathonFISC/equipo-02/blob/docs/frontend-spec/docs/reference/frontend/ux-flows.md#errors-and-recovery)

## Context
G7 under ADR-0003. Uses the BFF and read endpoints from #40 and the `MatchDecision` from #45. The UI mirrors `ApplicationService` gates and never decides them.

## Acceptance Criteria
- [ ] The vacancy detail shows "Preparar mi postulación"; an anonymous user goes through `/ingresar?next=` and returns to the same vacancy (AC-55).
- [ ] Preparing creates a draft with the vacancy's `MatchDecision` and the candidate's declared evidence, then opens `/postulaciones/<id>` with CV, cover letter, and evidence tabs (AC-56).
- [ ] Deselecting evidence or editing text sends a correction; undeclared evidence cannot be added; after a correction prior approvals show as cleared (AC-57, AC-58).
- [ ] "Aprobar mi postulación" records candidate approval; "Enviar postulación" stays disabled until every required approval covers the selected evidence (AC-59).
- [ ] A gated draft shows "Necesita revisión de tu orientador/a" with each reason in plain Spanish (AC-60).
- [ ] Submission uses one idempotency key per draft, reused on retry; a double tap creates one submission (AC-61).
- [ ] `/postulaciones` lists drafts and submissions with exactly one derived status per the status table (AC-62); a rejected draft shows role and reason with no send action (AC-63).
- [ ] "Rechazar" requires a reason (AC-64); runtime error codes map to the documented Spanish messages.
- [ ] After an employer decision, the status shows "Entrevista aprobada" or "No avanzó" on next load (AC-74).

## Validation
Unit tests for status derivation. e2e against the real runtime: draft → correct → approve → submit → retry (no duplicate); gated draft waits for the seeded counselor; employer decision reflected for the candidate. Axe and mobile helpers pass.

## Blocked By
- #40 — Add application read endpoints, employer organizations, and the web BFF to the application runtime
- #45 — Expose solver match decisions and show the readiness bar on vacancy cards and detail
