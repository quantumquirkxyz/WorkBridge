# Make the mobile web installable with a web app manifest

**Issue:** #38

**Owner:** MateoDG2006
**Parent spec:** #32
**Labels:** `ready-for-agent`
**Metadata**

- Project: none
- Milestone: none
- Fields: `work_type` = Ticket; `repo_scope` = web; `phase` = build; `priority` = low; `risk` = low; `sprint` = hackathon  ; `release_train` = none
- Todo: none
**Docs:** [Spec (AC-83, NG7)](https://github.com/HackathonFISC/equipo-02/blob/docs/frontend-spec/docs/reference/frontend/spec.md) · [Design system](https://github.com/HackathonFISC/equipo-02/blob/docs/frontend-spec/docs/reference/frontend/design-system.md)

## Context
OQ-9 decision: installable mobile web, no offline mode, no push notifications.

## Acceptance Criteria
- [ ] `app/manifest.ts` serves a manifest with name "Puente Laboral", short name "Puente", `display: "standalone"`, `start_url: "/"`, `theme_color` and `background_color` from the tokens (AC-83).
- [ ] Icons at 192 px and 512 px plus a maskable icon exist in `apps/web/public/`.
- [ ] The root layout sets `viewport` with `themeColor` for light and dark and `interactive-widget=resizes-content`.
- [ ] No service worker is registered.

## Validation
Chrome DevTools > Application shows an installable manifest with no errors; Lighthouse "Installable" passes on the deployed preview.

## Blocked By
- #33 — Adopt Tailwind v4, shadcn/ui, and the design tokens in apps/web
