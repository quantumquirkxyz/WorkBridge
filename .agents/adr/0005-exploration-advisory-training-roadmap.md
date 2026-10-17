# ADR-0005: Compose an advisory training roadmap from exploration evidence

## Status

Accepted

## Context

Ticket #10 requires the no-match path to "trigger the training-roadmap path when
no viable match exists", and ticket #11 owns the deterministic roadmap engine
(`@puente/training`, `buildRoadmap`).

ADR-0002 assigns aptitude classification and gap identification to the
deterministic solver (`@puente/solver`), and ADR-0004 keeps the exploration read
path ("`@puente/catalog`") from deciding aptitude or reaching into matching. The
exploration slice, however, has no candidate skill profile: it runs on the
candidate's **explicit preferences** plus the cached vacancy catalogue and
returns `ExplorationResult`. It therefore cannot produce the solver's real
aptitude decision or its `deriveGaps({ candidate, vacancy })` output.

Ticket #10 still needs the training path to *actually fire* on a no-match, and
its acceptance criterion forbids fabricating an application or silently
pretending a roadmap exists. Two questions had to be settled:

1. Who composes the roadmap, given the solver seam is not wired into exploration?
2. How does a roadmap get built without inventing solver output?

## Decision

- The **web integration layer** (`apps/web/lib/roadmap-handler.ts`) composes the
  two seams. Neither `@puente/catalog` nor `@puente/training` imports the other:
  `buildRoadmap` is invoked from the handler, not from the exploration engine.
- The roadmap built here is **advisory**. It is derived only from evidence the
  exploration actually holds — the required skills of *near-match* vacancies
  (vacancies blocked by exactly one declared constraint), mapped to canonical
  taxonomy ids via `matchSkill`, plus the candidate's declared availability,
  modality and target-role specializations. Skill labels that cannot be mapped to
  a taxonomy id are dropped rather than invented.
- Because no aptitude decision is available, the handler states
  `aptitude: "not_currently_apt"` **as an advisory input**, not as a solver
  verdict, and the derivation is named `deriveAdvisoryGaps` — never `deriveGaps`
  — so it can never be mistaken for the canonical `@puente/training` seam.
- The roadmap is built **only** when the exploration reported a no-match
  (`result.noMatch` is present) **and** the candidate declared
  `roadmapRequested` (`willing_to_train`). A result whose `matches` is empty only
  because a caller passed `limit: 0` has no `noMatch` and builds nothing.
- No external submission tool is called anywhere on this path.

## Consequences

- Ticket #10 ships a working, testable training trigger today, and the roadmap
  recommendations are real (`buildRoadmap` runs over the cached training
  catalogue) rather than a message that claims something happened.
- When the solver seam is wired into the exploration flow, this advisory
  composition is replaced by the solver's aptitude and `deriveGaps` output; the
  handler contract (`{ roadmap, gaps, reason }`) stays the same, so the dashboard
  does not change.
- The advisory nature is documented here and named in code, so a later reader
  cannot mistake `not_currently_apt` for a deterministic verdict.

## Alternatives considered

- **Import `@puente/solver` from exploration.** Rejected: it violates ADR-0002's
  step boundaries and ADR-0004's read-path rule, and the exploration slice has no
  candidate profile or vacancy to hand the solver.
- **Emit only a "roadmap requested" flag and build nothing.** Rejected: it does
  not satisfy the acceptance criterion that the training path is actually
  triggered, and it is exactly the unsubstantiated claim the review rejected.
- **Bump the exploration schema version to carry roadmap output.** Rejected: the
  roadmap is not part of the catalogue contract; it is a separate, additive
  response from its own handler.
