# Surface new saved-search matches with a nav badge and a section in Vacantes

**Issue:** #48

**Owner:** MateoDG2006
**Parent spec:** #32
**Labels:** `ready-for-agent`
**Metadata**

- Project: none
- Milestone: none
- Fields: `work_type` = Ticket; `repo_scope` = web; `phase` = build; `priority` = low; `risk` = low; `sprint` = hackathon  ; `release_train` = none
- Todo: none
**Docs:** [OQ-6 decision](https://github.com/HackathonFISC/equipo-02/blob/docs/frontend-spec/docs/reference/frontend/open-questions.md#oq-6--saved-searches) · [Spec (AC-82)](https://github.com/HackathonFISC/equipo-02/blob/docs/frontend-spec/docs/reference/frontend/spec.md)

## Context
OQ-6 decision. No email/WhatsApp/SMS in the MVP, so new matches are surfaced in-app. Saving a search requires a linked account (AC-79).

## Acceptance Criteria
- [ ] "Guardar esta búsqueda" on `/vacantes` opens a dialog with a name field; anonymous users are sent to `/ingresar?next=` first and the save completes after linking.
- [ ] The server records the candidate's last visit to `/vacantes`.
- [ ] When saved searches have matches newer than the last visit, the "Vacantes" nav item shows a count badge with the accessible label "N vacantes nuevas" (AC-82).
- [ ] `/vacantes` shows "Nuevas desde tu última visita" above the list with those matches; opening `/vacantes` clears the badge (AC-82).

## Validation
Handler test for new-since-last-visit; e2e: save search, seed a newer vacancy fixture, reload, badge and section appear, then clear.

## Blocked By
- #41 — Build the candidate shell and the Vacantes view with vacancy cards and the detail sheet
