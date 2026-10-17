# Add Better Auth sessions, roles, anonymous start, sign-in page, and role route groups

**Issue:** #37

**Owner:** MateoDG2006
**Parent spec:** #32
**Labels:** `ready-for-agent`
**Metadata**

- Project: none
- Milestone: none
- Fields: `work_type` = Ticket; `repo_scope` = web; `phase` = build; `priority` = high; `risk` = high; `sprint` = hackathon  ; `release_train` = none
- Todo: none
**Docs:** [Architecture: authentication](https://github.com/HackathonFISC/equipo-02/blob/docs/frontend-spec/docs/reference/frontend/architecture.md#authentication-better-auth) · [Screen S8](https://github.com/HackathonFISC/equipo-02/blob/docs/frontend-spec/docs/reference/frontend/screens.md#s8--ingresar-ingresar) · [Flow J10](https://github.com/HackathonFISC/equipo-02/blob/docs/frontend-spec/docs/reference/frontend/ux-flows.md#authentication-j10) · [OQ-3, OQ-11](https://github.com/HackathonFISC/equipo-02/blob/docs/frontend-spec/docs/reference/frontend/open-questions.md)

## Context
Safety boundary for G10. Better Auth with roles `candidate`, `employer`, `counselor` is in the stack (`apps/agent-runtime/src/application/roles.ts`, #12), but `apps/web` has no session. Decisions: anonymous start until saving or applying; Google + email magic link; `candidate_id = user.id`; counselor/employer accounts provisioned by a seed script.

## Acceptance Criteria
- [ ] `lib/auth.ts` configures Better Auth on Neon with a `role` user field (`defaultValue: "candidate"`, `input: false`) and an `employerOrgId` field, plus the `anonymous` plugin.
- [ ] `/api/auth/[...all]` serves Better Auth; `lib/auth-client.ts` exposes the client for sign-in, sign-out, and `useSession`.
- [ ] `/ingresar` offers exactly "Continuar con Google" and an email magic link (AC-75), and honours `?next=` after sign-in.
- [ ] Linking an account from an anonymous session keeps the same `user.id` (AC-79 identity part).
- [ ] Route groups `(candidate)`, `orientador`, `empresa` check `session.user.role` in their server `layout.tsx`; a wrong role is redirected to its role home and a signed-out user to `/ingresar?next=` (AC-65, AC-70, AC-76).
- [ ] Placeholder pages exist for `/orientador` and `/empresa` showing the signed-in role and "Cerrar sesión" (AC-80).
- [ ] `scripts/seed-roles.ts` creates one counselor and one employer (with an organization) per environment and is idempotent (NG8).
- [ ] No secret is exposed through `NEXT_PUBLIC_*`; the role cannot be set from the client.

## Validation
Handler/unit tests for role guards. e2e: sign in as each seeded role and land on the right home; a candidate visiting `/orientador` is redirected; an anonymous visitor can open `/` without signing in.

## Blocked By
- #33 — Adopt Tailwind v4, shadcn/ui, and the design tokens in apps/web

## Risks
Google OAuth needs client credentials per environment; magic link needs an email transport — document both in `docs/how-to` and use a console transport locally.
