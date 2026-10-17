# Certo local

Certo runs as its own service from `apps/certo`. That directory is a clone of the upstream repository, pinned to commit `6fd0a11fe2ff616d49da2a935b3e9d2cb88e1ffe` (AGPL-3.0). The verifier calls the public API at `http://localhost:1337`.

## Clone

From `Agent-Hackathon`:

```bash
git clone https://github.com/Schroedinger-Hat/certo.git apps/certo
git -C apps/certo checkout 6fd0a11fe2ff616d49da2a935b3e9d2cb88e1ffe
```

Requires Docker. The pinned commit is AGPL-3.0.

## Start and stop

```bash
npm run certo:up
npm run certo:down
```

`certo:up` starts Postgres, Mailhog, and the Strapi API. It does not start Certo's Nuxt frontend, because that frontend publishes port 3000 and the intake already uses that port. The API listens on `http://localhost:1337`. Postgres is published on host port 5433.

The pinned commit runs `2026-08-06_add_profile_owner.js` before Strapi creates `profiles`, so a fresh database crash-loops. `certo:up` adds a `hasTable('profiles')` guard in `apps/certo` and rebuilds the API image when that guard was missing. The schema already defines `owner`, so the first boot creates the column.

The first boot seeds an admin user and a sample credential. Certo documents that login as `admin@certo.com` / `certo` at `http://localhost:1337/admin`. Seed data is created only on the first run.

## Application configuration

In the monorepo `.env`:

```bash
CERTO_BASE_URL=http://localhost:1337
CERTO_API_TOKEN=
```

Set `CERTO_API_TOKEN` to a non-empty server-side value. The public verify and validate routes do not receive that token, but the runtime treats a blank token as Certo not configured. `npm start` loads `.env` with Node's `--env-file`. Do not commit `.env` or Strapi secrets (`JWT_SECRET`, `APP_KEYS`, `ENCRYPTION_KEY`).

HTTP is accepted only for `localhost` and `127.0.0.1`. Any other host must use `https://`.

## Check a seeded credential

Wait until `http://localhost:1337/admin` responds. Read the seeded `credentialId` from the Strapi admin, then call `verifyCredential` with that id, `CERTO_BASE_URL`, and `CERTO_API_TOKEN`. The provider is `certo`. A holder id that does not match the credential recipient is `rejected` by holder binding; that is not a transport failure.
