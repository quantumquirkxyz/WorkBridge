# Resolving merge conflicts

**Status:** resolved  
**Branch:** `feat/issue-6-build-normalized-credential-verification`  
**Source:** merge of `origin/main` @ `58805c5cb494ac3ad21a47bb392ae88db9ae287b`  
**Merge commit:** `c6ef6ca7d3ab9874f9d4cbba165a98c7dbaf01f1`  
**Next consumer:** `review-pr`

## Conflicts

- `apps/agent-runtime/package.json`
- `apps/agent-runtime/src/index.ts`
- `apps/agent-runtime/tsconfig.json`
- `package-lock.json`
- `vitest.config.ts`

## Resolution

The package keeps `@puente/ingestion` and `@puente/profile` from `main`, and keeps Ajv plus the `verifyCredential` and `verificationConfigFromEnv` exports from this branch. The package TypeScript project extends the root config. Vitest keeps `main`'s include patterns and also runs `apps/**/test/**/*.test.ts`. The lockfile was regenerated with `npm install`.

## Validation

- `npx tsc --noEmit -p tsconfig.json` passed.
- `npm test` passed: 27 files, 261 tests.
- `npm run lint` reports one error already present on `main` in `packages/ingestion/src/ocr.ts`. This merge did not change that file.

## Remaining

`.agents/skills/platform/traces/2026-10-16.jsonl` was stashed and restored. It was not committed. The pull request is not merged. `ship-subissue` waits for a clean `review-pr` pass on this merged tree.
