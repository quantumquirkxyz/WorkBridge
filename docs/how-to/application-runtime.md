# Application runtime

Issue #12 serves role-gated drafts and submissions from
`apps/agent-runtime/src/application`. Assumed inputs from issues #8 and #9 are
documented in `docs/reference/assumed-contracts.md`.

## Local Docker (Alpine)

```bash
docker build -t puente-application .
docker run --rm -p 3000:3000 puente-application
```

The image is `node:22-alpine`. With neither database URL set, persistence stays
in memory and `GET /health` returns `"databaseMode": "memory"`.

## Vercel with Neon backup

`vercel.json` routes every request to `apps/agent-runtime/src/application/vercel.ts`.
Set `DATABASE_URL` for the primary Postgres connection. When that variable is
empty and `NEON_DATABASE_URL` is set, idempotency uses the SQL store for that
URL and health reports `"databaseMode": "neon-backup"` with `"persistence": "sql"`.
The connection string is not returned. `BETTER_AUTH_SECRET` signs session roles.

The SQL idempotency table is `submission_idempotency` (`idempotency_key`,
`fingerprint`, `response`). Connection strings stay in the host environment.
They are listed in `.env.example` and are rejected if a client tries to place
them, `CERTO_TOKEN`, or a provider key inside a draft or audit reason.

Copy `.env.example` to `.env` for local runs. Do not commit `.env`.
