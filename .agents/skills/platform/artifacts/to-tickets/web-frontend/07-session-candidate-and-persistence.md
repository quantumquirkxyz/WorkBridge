# Derive the candidate id from the session and persist profile, preferences, and saved searches with read and delete endpoints

**Issue:** #39

**Owner:** MateoDG2006
**Parent spec:** #32
**Labels:** `ready-for-agent`
**Metadata**

- Project: none
- Milestone: none
- Fields: `work_type` = Ticket; `repo_scope` = web; `phase` = build; `priority` = high; `risk` = high; `sprint` = hackathon  ; `release_train` = none
- Todo: none
**Docs:** [Spec (AC-13, AC-38, AC-78, R5)](https://github.com/HackathonFISC/equipo-02/blob/docs/frontend-spec/docs/reference/frontend/spec.md) · [Architecture: route map](https://github.com/HackathonFISC/equipo-02/blob/docs/frontend-spec/docs/reference/frontend/architecture.md#route-map) · [Current state (CS-2, CS-7, CS-8)](https://github.com/HackathonFISC/equipo-02/blob/docs/frontend-spec/docs/reference/frontend/current-state.md)

## Context
Connects profile, preferences, exploration, and searches under one candidate (G2) and makes data survive restarts. Today preferences derive their own id (CS-2), stores are in memory (R5), there are no read endpoints (CS-8), and delete leaves the profile behind (CS-7).

## Acceptance Criteria
- [ ] `/api/intake`, `/api/preferences`, `/api/explore`, `/api/searches` take the candidate id from the Better Auth session (anonymous or linked) and ignore any id sent by the browser (AC-13).
- [ ] Requests without a session return 401; a session can only read or change its own candidate data (AC-78).
- [ ] Preferences and saved searches are stored in Neon behind the existing `PreferencesStore` and `SavedSearchesStore` interfaces; in-memory stores remain for tests.
- [ ] `GET /api/profile` and `GET /api/preferences` return the current documents or 404.
- [ ] `DELETE /api/candidate` deletes profile, preferences, and saved searches (AC-38 server part); the old `DELETE /api/preferences` is removed or delegates to it.
- [ ] Existing handler tests are updated; new handler tests cover 401, ownership, read, and full deletion.

## Validation
`npm run verify`; handler tests; manual: create data anonymously, restart the dev server, data is still there; delete removes all three documents.

## Blocked By
- #37 — Add Better Auth sessions, roles, anonymous start, sign-in page, and role route groups

## Risks
Migration needed for the new tables; add it under `migrations/` following the existing convention.
