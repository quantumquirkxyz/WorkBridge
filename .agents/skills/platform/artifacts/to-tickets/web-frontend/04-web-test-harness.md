# Add the web test harness: jsdom component tests, Playwright web project with device profiles, axe and visual checks

**Issue:** #36

**Owner:** MateoDG2006
**Parent spec:** #32
**Labels:** `ready-for-agent`
**Metadata**

- Project: none
- Milestone: none
- Fields: `work_type` = Ticket; `repo_scope` = web; `phase` = build; `priority` = high; `risk` = low; `sprint` = hackathon  ; `release_train` = none
- Todo: none
**Docs:** [Test strategy](https://github.com/HackathonFISC/equipo-02/blob/docs/frontend-spec/docs/reference/frontend/testing.md) · [Accessibility](https://github.com/HackathonFISC/equipo-02/blob/docs/frontend-spec/docs/reference/frontend/accessibility.md)

## Context
Today Vitest runs only `*.test.ts` in a node environment, coverage excludes `apps/web`, and Playwright only targets `apps/agent-runtime/e2e`. Every later slice needs a place to add component, e2e, accessibility, and visual tests.

## Acceptance Criteria
- [ ] Vitest has a jsdom project for `apps/web/tests/components/**/*.test.tsx` with Testing Library, `user-event`, MSW, and `vitest-axe` set up in a setup file.
- [ ] Coverage includes `apps/web/lib/**/*.ts` and `apps/web/components/**/*.tsx` (excluding `components/ui/**`) under the existing thresholds.
- [ ] Playwright has a `web` project (`testDir: apps/web/e2e`) with its own `webServer` for `@puente/web` started without `OPENROUTER_API_KEY`, and device projects `Pixel 7`, `iPhone 14`, `Desktop Chrome` (AC-54).
- [ ] A shared e2e helper runs `@axe-core/playwright` and fails on serious or critical violations (AC-40) in light and dark color schemes; the e2e suite invokes it for every application route in both themes.
- [ ] A shared e2e helper asserts no horizontal scroll at the current viewport (AC-42).
- [ ] A shared e2e helper asserts that candidate pages contain none of `trace`, `extractor`, `CandidateProfile`, `confidence` (AC-44).
- [ ] One smoke e2e test covers `/` on all three devices using the helpers; route smoke tests cover every application route in both themes; one sample component test renders a shadcn `Button` and passes axe.
- [ ] The existing runtime Playwright project keeps working.

## Validation
`npm run test`, `npm run test:coverage`, and `npm run test:e2e` pass locally; `npm run test:e2e` reports axe coverage for every application route in both themes; README section in `docs/reference/frontend/testing.md` updated with the commands.

## Blocked By
- #33 — Adopt Tailwind v4, shadcn/ui, and the design tokens in apps/web

## Risks
Two webServers in one Playwright config; use distinct ports and per-project `webServer` arrays.
