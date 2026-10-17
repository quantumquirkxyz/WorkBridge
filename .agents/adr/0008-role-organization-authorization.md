# ADR-0008: Bind employer access to the seeded organization

## Status

Proposed — 2026-10-17. Review with the first counselor and employer surfaces.

## Context

The web redesign adds counselor and employer surfaces to the existing application lifecycle. An
employer must see only submissions for vacancies owned by that employer's organization, while
candidates and counselors have different ownership and review boundaries. A browser-selected role
or organization would allow cross-role or cross-organization access.

## Decision

- Better Auth remains the source of identity and role. `role` and nullable `employerOrgId` are
  server-managed user fields and are never accepted from browser input.
- The per-environment seed script provisions counselor and employer users and assigns employer
  users to an organization; vacancies carry the same `employerOrgId`.
- The signed server-to-runtime session includes `employerOrgId` for employers. The BFF and runtime
  re-check role and organization ownership, returning 403 for cross-organization reads.
- The sign-in surface exposes only Google and email magic-link authentication; linking preserves the
  existing candidate `user.id`.

## Consequences

- Employer listings can be filtered and authorized by a stable organization boundary.
- Role and organization provisioning is operational setup, not a browser or admin-console feature.
- Seed data and the runtime session contract must evolve together when organization ownership changes.

## Alternatives considered

- **Trust a browser-supplied organization id.** Rejected: it permits cross-organization access.
- **Create a separate employer application.** Rejected: the redesign uses one Next.js app with
  role-specific route groups and shared authentication.

## Links

- Spec: `docs/reference/frontend/spec.md` (AC-65–AC-76, NG5, NG8)
- Architecture: `docs/reference/frontend/architecture.md` (Authentication, role enforcement)
- Parent authorization decision: ADR-0003
