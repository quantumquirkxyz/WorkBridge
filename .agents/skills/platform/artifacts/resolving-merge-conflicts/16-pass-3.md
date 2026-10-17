# Merge resolution, pass 3

`origin/main` moved to `e481da2` when pull request #19 landed the Mastra workflow. Three files conflicted.

- `apps/agent-runtime/package.json` keeps Ajv and the credential description together with `@mastra/core`.
- `apps/agent-runtime/src/index.ts` exports `verifyCredential` and the workflow API.
- `package-lock.json` was regenerated with `npm install`.

Root typecheck passed. The suite passed 34 files and 309 tests. Merge commit: `b0f7724`.
