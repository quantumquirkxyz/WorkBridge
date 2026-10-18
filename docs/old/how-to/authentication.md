# Configure web authentication

`apps/web` uses Better Auth with Neon/Postgres. Keep every auth secret server-side:

- `BETTER_AUTH_SECRET` signs and encrypts Better Auth state.
- `DATABASE_URL` points to the Neon Postgres database.
- `BETTER_AUTH_URL` is the public origin for callbacks, for example `http://localhost:3001`.
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` enable Google OAuth. Do not expose either value through `NEXT_PUBLIC_*`.

For local development, email magic links are written to the server console. A production email transport can replace the console sender in `apps/web/lib/auth.ts`, but the transport API key must remain server-only.

## Seed staff roles

Run the Better Auth migration before seeding:

```powershell
neon psql production -- -f migrations/002_better_auth.sql
```

Then seed one counselor and one employer account for the environment:

```powershell
npm run seed:roles
```

The seed is idempotent. Override `AUTH_SEED_ENV`, `SEED_COUNSELOR_EMAIL`, or `SEED_EMPLOYER_EMAIL` to create distinct accounts per environment. Candidate accounts are not seeded; Better Auth creates candidates with `role = "candidate"` by default, and the role field is configured with `input: false` so clients cannot set it.
