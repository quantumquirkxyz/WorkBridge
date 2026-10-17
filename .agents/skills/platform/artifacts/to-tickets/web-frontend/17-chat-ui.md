# Build the welcome screen and the chat UI from profile capture to first exploration

**Issue:** #49

**Owner:** MateoDG2006
**Parent spec:** #32
**Labels:** `ready-for-agent`
**Metadata**

- Project: none
- Milestone: none
- Fields: `work_type` = Ticket; `repo_scope` = web; `phase` = build; `priority` = high; `risk` = high; `sprint` = hackathon  ; `release_train` = none
- Todo: none
**Docs:** [Screens S1, S2](https://github.com/HackathonFISC/equipo-02/blob/docs/frontend-spec/docs/reference/frontend/screens.md#s2--chat-chat) · [Chat model](https://github.com/HackathonFISC/equipo-02/blob/docs/frontend-spec/docs/reference/frontend/ux-flows.md#chat-model) · [Accessibility (B1, B2, B7)](https://github.com/HackathonFISC/equipo-02/blob/docs/frontend-spec/docs/reference/frontend/accessibility.md)

## Context
Completes journey J1 end to end on top of the chat endpoint (#42) and the Vacantes view (#41). Replaces the legacy `IntakeForm`. Attachments and voice come in "Add CV attachments and voice input to the chat".

## Acceptance Criteria
- [ ] `/` shows the welcome screen with one primary "Empezar" opening `/chat`; signed-in users with a profile are redirected to `/vacantes` (AC-01).
- [ ] `/chat` renders bot and user bubbles, quick-reply chips, confirmation chips ("Sí" / "Cambiar"), a phase progress indicator, and a sticky composer that stays above the on-screen keyboard (AC-03, AC-47, AC-52).
- [ ] The message list is `role="log"` with `aria-live="polite"`; focus stays in the composer; `Enter` sends and `Shift+Enter` adds a newline (B1).
- [ ] A typing indicator shows during requests and "Estoy pensando…" after 3 s (R10).
- [ ] When the profile phase completes, the client sends one `POST /api/intake` for each captured source under the same server-derived candidate id; the server merges skills and experiences by canonical id, appends evidence, and removes no previously stored item (AC-07). It then shows "Estoy leyendo lo que me contaste…", the summary with counts of skills and experiences, and up to four skill chips (AC-08, AC-09); `needs_review` adds the Mi perfil sentence without technical warnings (AC-10).
- [ ] Failures show a retry message with a "Reintentar" chip and keep the transcript (AC-11).
- [ ] Preference slots already known start filled (AC-14); after the last confirmation the client calls `/api/explore` once and navigates to `/vacantes` (AC-16).
- [ ] "Cambiar" on the last user bubble resets that slot.
- [ ] `IntakeForm.tsx` is removed; its file helper moves to `lib/files.ts`.

## Validation
Component tests for `ChatScreen` with MSW (happy path, off-slot question, confirmation, retry). e2e J1 with no API key (fallback path) on all three device profiles, ending on `/vacantes`; axe passes in both themes.

## Blocked By
- #42 — Add the LLM-guided chat endpoint with the slot agenda, fallback, and turn cap
- #41 — Build the candidate shell and the Vacantes view with vacancy cards and the detail sheet
