# Frontend testing

Commands for the web test harness added in #36. Component tests run in jsdom;
end-to-end tests run in Playwright against `@puente/web` and the existing
agent-runtime project.

## Commands

| Command | What it runs |
|---|---|
| `npm run test` | Vitest unit, handler, and jsdom component tests |
| `npm run test:coverage` | Same suites with the 80% line / 80% statement / 80% function / 70% branch thresholds |
| `npm run test:e2e` | Playwright `runtime`, device smokes `Pixel 7`, `iPhone 14`, and `Desktop Chrome`, plus the visual project `web` |
| `npm run test:e2e:web` | Playwright project `web` (`intake-explore.spec.ts` on Desktop Chrome) |
| `npm run verify` | Lint, typecheck, and Vitest |
| `npm run gate:ci` | Typecheck and coverage |

## Vitest

Two projects share the root `vitest.config.ts`:

- **node** — existing `*.test.ts` suites (`environment: "node"`).
- **jsdom** — `apps/web/tests/components/**/*.test.tsx` with setup at
  `apps/web/tests/components/setup.ts` (Testing Library matchers, `@testing-library/user-event`,
  MSW `setupServer`, and `vitest-axe`).

Coverage includes `apps/web/lib/**/*.ts` and `apps/web/components/**/*.tsx`,
excluding `apps/web/components/ui/**`, under the thresholds above.

## Playwright

`playwright.config.ts` starts both servers from a top-level `webServer` array
on distinct ports (Playwright 1.64.1 does not type or launch per-project
`webServer` entries). Each project then uses its own `testDir` and `baseURL`:

| Project | `testDir` | Server | Port |
|---|---|---|---|
| `runtime` | `apps/agent-runtime/e2e` | agent-runtime | 4371 |
| `Pixel 7` | `apps/web/e2e` (`home.smoke.spec.ts`) | `@puente/web` (`next dev`, memory persistence, no `OPENROUTER_API_KEY` or `DATABASE_URL`) | 4372 |
| `iPhone 14` | `apps/web/e2e` (`home.smoke.spec.ts`) | same web server | 4372 |
| `Desktop Chrome` | `apps/web/e2e` (`home.smoke.spec.ts`) | same web server | 4372 |
| `web` | `apps/web/e2e` (`intake-explore.spec.ts`) | same web server | 4372 |

Shared helpers in `apps/web/e2e/helpers.ts`:

- `expectNoSeriousAxeViolations` — `@axe-core/playwright` in light and dark; fails on serious or critical.
- `expectNoHorizontalScroll` — `scrollWidth <= clientWidth` at the current viewport.
- `expectNoTechnicalCandidateVocabulary` — candidate copy must not contain
  `trace`, `extractor`, `CandidateProfile`, or `confidence`.

The smoke spec `apps/web/e2e/home.smoke.spec.ts` covers `/` on all three devices
with those helpers. The runtime submission suite keeps using its own server on port 4371.
