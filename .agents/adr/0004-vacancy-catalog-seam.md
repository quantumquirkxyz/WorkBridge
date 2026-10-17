# ADR-0004: Add a cached vacancy catalog seam for exploration

## Status

Accepted

## Context

Ticket #7 needs the candidate to explore cached vacancies by their explicit
preferences, and the parent spec (#1) expects vacancy results to carry
**provenance** and freshness. The matching execution plane is owned by the
solver seam (ADR-0002 step 3, `@puente/solver`), so exploration must stay a
separate, deterministic pre-match read path rather than reach into matching.

Two questions had to be settled:

1. Where do the vacancy and exploration contracts live?
2. How fresh must a vacancy be to be recommended automatically?

`CONTEXT.md` fixes the shared domain vocabulary and contracts to JSON Schema
2020-12 validated with Ajv in `packages/domain`. `packages/solver` already
defines its own `match-decision` contract next to its implementation.

## Decision

- Introduce `@puente/catalog` as its own package for the cached vacancy catalog
  and preference exploration, with a **deterministic** `ExplorationAgent` seam.
- Define `CachedVacancy` and `ExplorationResult` as JSON Schema contracts inside
  the package that owns them (`packages/catalog/src/schemas/`), reusing the
  shared `createAjv` from `packages/domain`. This follows the existing
  `packages/solver` precedent: contracts live next to the module that owns them,
  while cross-cutting vocabulary stays in `packages/domain`.
- Keep `CandidatePreferences` as a **separate** validated document from
  `CandidateProfile`. The profile owns extracted candidate evidence; preferences
  are declared by the candidate and must never be inferred, enforced by the
  `origin: "candidate_explicit"` constant in the contract.
- **72-hour freshness rule:** a vacancy whose `postedAt` is older than 72 hours
  is excluded from automatic recommendation *before* any compatibility check, so
  a long-lived cache entry cannot masquerade as fresh. The window is a named
  constant (`DEFAULT_MAX_AGE_HOURS`), not a magic number.
- Preserve `jobId`, `jobUrl`, the query date (`queriedAt`), and `scrapingInfo`
  verbatim on every cached vacancy so exploration can always cite provenance.

## Consequences

- The candidate data plane stays separate from the matching execution plane, as
  ADR-0002 requires.
- Exploration is a pre-match filter: it does not decide aptitude or rank a
  candidate; `@puente/solver` re-derives the hard constraints later.
- Preferences are persisted in-process behind a `PreferencesStore` interface.
  In-process persistence is the **accepted scope for this MVP slice** (ticket
  #7); a durable (PostgreSQL/Prisma) implementation can replace it behind the
  same interface without changing callers, and remains a named follow-up.
- The catalog is served from a bundled seed fixture until the Apify LinkedIn
  Jobs refresh is wired, so the demo is deterministic and offline-safe.

## Alternatives considered

- **Put the vacancy/exploration contracts in `packages/domain`.** Rejected: they
  are owned by the exploration module, and `packages/solver` already set the
  per-package precedent. Cross-cutting enums (modality, contract type, transport
  mode, location) remain in `packages/domain`.
- **Merge preferences into `CandidateProfile`.** Rejected: it would blur declared
  preferences with extracted evidence and weaken the "never inferred" guard.
- **Treat every cached vacancy as recency-agnostic.** Rejected: stale postings
  would reach the candidate automatically, contradicting the freshness
  requirement.
