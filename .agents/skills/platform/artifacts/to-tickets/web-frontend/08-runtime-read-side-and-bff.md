# Add application read endpoints, employer organizations, and the web BFF to the application runtime

**Issue:** #40

**Owner:** MateoDG2006
**Parent spec:** #32
**Labels:** `ready-for-agent`
**Metadata**

- Project: none
- Milestone: none
- Fields: `work_type` = Ticket; `repo_scope` = application; `phase` = build; `priority` = high; `risk` = critical; `sprint` = hackathon  ; `release_train` = none
- Todo: none
**Docs:** [Spec: seams](https://github.com/HackathonFISC/equipo-02/blob/docs/frontend-spec/docs/reference/frontend/spec.md#seams-and-testing-decisions) · [Architecture: BFF](https://github.com/HackathonFISC/equipo-02/blob/docs/frontend-spec/docs/reference/frontend/architecture.md#authentication-better-auth) · [OQ-10](https://github.com/HackathonFISC/equipo-02/blob/docs/frontend-spec/docs/reference/frontend/open-questions.md)

## Context
`ApplicationService` (#12) exposes only writes plus `/audit`; the candidate, counselor, and employer surfaces need lists and detail reads. OQ-10: employers decide interview progression only, scoped to their organization's vacancies. The web reaches the runtime only through a server-side BFF (D8).

## Acceptance Criteria
- [ ] Runtime adds `GET /drafts?candidateId=` (owner only), `GET /drafts/:id` (owner, or counselor when the draft has gate reasons), `GET /drafts?gate=counselor&pending=true` (counselor), and `GET /submissions?interview=pending_employer_approval` (employer, filtered by `employerOrgId`).
- [ ] Each read enforces role and ownership in `ApplicationService`; violations return 403 with `forbidden`.
- [ ] Vacancies carry `employerOrgId`, and the signed `BetterAuthSession.user` carries `employerOrgId` for employers; signature verification covers the new field.
- [ ] An employer reading a submission for another organization's vacancy gets 403 (AC-71).
- [ ] `apps/web/app/api/applications/[...path]/route.ts` reads the Better Auth session, signs it with `signBetterAuthSession` and `BETTER_AUTH_SESSION_SECRET`, and forwards to `AGENT_RUNTIME_URL` (AC-77).
- [ ] The BFF adds `traceId` when missing and passes through the client's `idempotencyKey` unchanged.
- [ ] Draft and submission views expose the history (actor role, timestamp, reason) needed for "Historial" without trace ids.

## Validation
Runtime unit tests per endpoint and role; extend `apps/agent-runtime/e2e` with read paths for all three roles; BFF handler test with a fake runtime asserting the signed session and that the secret never appears in responses.

## Blocked By
- #37 — Add Better Auth sessions, roles, anonymous start, sign-in page, and role route groups

## Risks
Changing the signed session shape is a contract change between web and runtime; update both sides and the signature test in the same PR.
