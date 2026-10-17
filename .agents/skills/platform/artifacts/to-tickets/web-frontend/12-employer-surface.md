# Build the employer interview-decision surface

**Issue:** #44

**Owner:** MateoDG2006
**Parent spec:** #32
**Labels:** `ready-for-agent`
**Metadata**

- Project: none
- Milestone: none
- Fields: `work_type` = Ticket; `repo_scope` = web; `phase` = build; `priority` = medium; `risk` = high; `sprint` = hackathon  ; `release_train` = none
- Todo: none
**Docs:** [Screen S12](https://github.com/HackathonFISC/equipo-02/blob/docs/frontend-spec/docs/reference/frontend/screens.md#s12--empresa-empresa-empresasubmissionid) · [Application lifecycle](https://github.com/HackathonFISC/equipo-02/blob/docs/frontend-spec/docs/reference/frontend/ux-flows.md#application-lifecycle-j7j9) · [OQ-10](https://github.com/HackathonFISC/equipo-02/blob/docs/frontend-spec/docs/reference/frontend/open-questions.md)

## Context
G9. Employers only decide interview progression for submissions to their organization's vacancies (NG3, OQ-10). Fairness boundary: no protected attributes.

## Acceptance Criteria
- [ ] `/empresa` lists submissions with interview status "Pendiente" for the employer's organization only (AC-71).
- [ ] `/empresa/[submissionId]` shows only the submitted documents and the evidence the candidate approved; no age, gender, address, photo, or rejected/deselected evidence (AC-72).
- [ ] "Pasar a entrevista" and "No avanza" both require a reason and record actor, role, time, and reason through the BFF (AC-73).
- [ ] The queue renders as cards and the detail full-screen at 360 px (AC-53); the empty state reads "No hay postulaciones pendientes".

## Validation
e2e as the seeded employer: decide one submission each way; a submission from another organization returns 403 and is not listed; axe and mobile helpers pass.

## Blocked By
- #40 — Add application read endpoints, employer organizations, and the web BFF to the application runtime
