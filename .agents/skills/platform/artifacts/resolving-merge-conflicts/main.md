# Resolve conflict: local main

Status: resolved.

Local `main` merged `origin/main` in `759b3c2` and `bcc13b4`. The second merge left a duplicate `MatchDecision` import; that is removed in the follow-up commit.

## Resolution

- `apps/web/next.config.mjs`: keep `allowedDevOrigins` and the comment that Playwright uses `127.0.0.1`.
- `playwright.config.ts`: keep the shipped `runtime` project and the Pixel 7, iPhone 14, and Desktop Chrome smokes on ports 4371 and 4372. Add project `web` for `intake-explore.spec.ts`. The web server uses memory persistence and blanks `OPENROUTER_API_KEY` and `DATABASE_URL`.
- `package-lock.json`: take `origin/main`, then `npm install`.
- `apps/web/lib/neon-repository.ts`: memory mode deletes profile, preferences, and saved searches in process. Neon mode also deletes `candidate_saved_searches`. Saved-search reads and writes follow the same split.
- `apps/agent-runtime/src/matching/adapt.ts`: one `MatchDecision` import from `@puente/solver`.

## Evidence

- Conflict markers: none.
- `npx playwright test --list`: 12 tests.
- `apps/web/tests/neon-repository.test.ts`: 3 passed.
- `tsc --noEmit`: no errors outside the untracked `apps/certo` tree.

## Remaining

`apps/certo/` is still untracked and was not part of this merge. `main` was not pushed.
