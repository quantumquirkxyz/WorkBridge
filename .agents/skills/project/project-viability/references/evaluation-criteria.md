# Evaluation Criteria

Use these thresholds when scoring viability, functionality, and scalability. A rating must be justified by at least one concrete finding with a citation.

## Confidence Criteria

Use these criteria when assigning confidence levels to findings:

- **High:** ≥2 independent citations supporting the finding, or 1 citation with automated baseline confirmation.
- **Medium:** 1 citation with no automated confirmation, or 2 weak citations.
- **Low:** No direct citation; finding is an inference from structure or naming alone.

Findings with `Low` confidence must be flagged explicitly and must not drive `Not viable` or `Broken` ratings alone.

## Numeric Scoring

In addition to categorical ratings, assign a numeric score 1–5 per dimension:

- 5 — Excellent, no material concerns
- 4 — Good, minor improvements possible
- 3 — Adequate, at least one material concern
- 2 — Poor, multiple material concerns
- 1 — Critical, project is blocked or fundamentally broken

Numeric scores enable tracking across assessments. Include both categorical rating and numeric score in the executive summary.

## Evidence Requirements

Every rating must be backed by evidence that cites one of the following:
- `CONTEXT.md` section or line range
- ADR path (e.g., `docs/adr/0001-context.md`)
- Concrete code location (e.g., `src/module/file.py:42`)
- Automated baseline signal (e.g., `health-baseline: import-count=47`)

A rating without a cited source is invalid. If insufficient evidence exists, downgrade to the lower confidence bracket and note the gap.

## Risk Matrix per Finding

Assign a risk level to every finding based on Likelihood × Impact:

| Impact | High | Medium | Low |
|--------|------|--------|-----|
| High | High | High | Medium |
| Medium | High | Medium | Low |
| Low | Medium | Low | Low |

**Impact definitions:**
- **High:** Finding affects core domain paths, production invariants, or primary data plane.
- **Medium:** Finding affects secondary paths, developer experience, or team velocity.
- **Low:** Finding affects edge cases, error messages, or non-critical tooling.

**Likelihood definitions:**
- **High:** Finding is confirmed in production code paths, or automated baseline shows active signal.
- **Medium:** Finding is confirmed in code but not in production, or shows structural trend.
- **Low:** Finding is theoretical, based on naming or structure alone, or not yet exercised.

Findings with `High` risk must appear in the report's priority matrix as P0 or P1.

## Viability

**Viable (5)**
- `CONTEXT.md` goals are achievable with the current module boundaries.
- ADR decisions are internally consistent and implemented.
- No dead code, orphaned modules, or abandoned integration seams.
- Evidence requirement: ≥2 positive findings with citations.

**Conditional (3)**
- Goals are achievable but depend on resolving a specific blocker (e.g., missing data layer, contradicted ADR).
- One or more modules exist without a clear caller or purpose.
- Evidence requirement: ≥1 blocker identified with exact path and ≥1 positive finding.

**Not viable (1)**
- `CONTEXT.md` goals contradict the codebase shape.
- Core ADR decisions are violated and cannot be reconciled without rewrites.
- The project is missing its primary abstraction or data plane.
- Evidence requirement: ≥1 blocker that is structurally irreconcilable (not just missing tests or docs).

### Viability Anti-patterns

- **Ghost module:** A module exists with no callers and no tests → Conditional unless it violates a stated goal.
- **ADR drift:** Code implements behavior that contradicts an ADR without a superseding ADR → Not viable if the contradicted behavior is core.
- **Goal-code mismatch:** `CONTEXT.md` describes a web service but the repo is a CLI tool → Not viable unless `CONTEXT.md` is outdated.

## Functionality

**Complete (5)**
- Every behavior described in `CONTEXT.md` and the ADRs has a matching implementation.
- No undocumented behavior contradicts the domain model.
- Evidence requirement: ≥3 positive findings covering core paths, plus zero contradictory findings on critical paths.

**Partial (3)**
- Some documented behavior is missing or only partially implemented.
- Gaps are localized and do not break core invariants.
- Evidence requirement: ≥1 missing implementation with path and ≥1 working implementation with path.

**Broken (1)**
- Documented behavior is contradicted by implementation.
- Core invariants from `CONTEXT.md` or ADRs are violated in production paths.
- Evidence requirement: ≥1 contradictory finding on a production code path with exact file and line.

### Functionality Anti-patterns

- **Zombie doc:** `CONTEXT.md` describes a feature that exists only in comments or stubs → Partial (not Broken) unless the missing feature is core.
- **Surprise behavior:** Production code does something not documented and not aligned with domain vocabulary → Partial or Broken depending on whether it breaks invariants.
- **Test-only implementation:** Behavior exists only in tests, not in production code → Partial.

## Scalability

**Scalable (5)**
- Modules are deep: small interfaces, large behavior.
- New domain concepts can be added at existing seams without rewriting core logic.
- Logical changes concentrate in one module or layer.
- Evidence requirement: ≥2 positive findings showing clear seams and low coupling.

**Bounded (3)**
- The current architecture supports growth up to a known limit (e.g., single-region deployment, synchronous call graph).
- Adding new dimensions requires explicit refactoring, but the path is clear.
- Evidence requirement: ≥1 bounded factor with exact seam that would need refactoring.

**Fragile (1)**
- Shotgun surgery or divergent change is the norm.
- New domain concepts require changes across unrelated modules.
- The codebase has no clear seam for storage, transport, or presentation changes.
- Evidence requirement: ≥2 unrelated modules that would change for a single new concept.

### Scalability Anti-patterns

- **Cross-cutting duplication:** Same logic copied in ≥3 modules for a single domain concept → Fragile.
- **God module:** One module imports from most of the codebase → Bounded at best; Fragile if it also has divergent change.
- **No seam:** Adding a new transport protocol requires changes in business logic → Fragile.

## Conflict Resolution Matrix

When dimensions disagree, resolve as follows:

| Viability | Functionality | Scalability | Overall interpretation |
|-----------|---------------|-------------|------------------------|
| Viable | Complete | Scalable | Healthy — proceed with planned growth |
| Viable | Complete | Bounded | Healthy but plan for architectural investment |
| Viable | Partial | Any | Conditional — functionality gaps limit real-world viability |
| Viable | Broken | Any | Conditional — broken paths undermine stated goals |
| Conditional | Complete | Any | Conditional — blocker must be resolved before scaling |
| Conditional | Partial | Any | Conditional — multiple risk factors |
| Conditional | Broken | Any | At risk — fundamental issues compound |
| Not viable | Any | Any | Not viable — stop or radically redefine scope |

**Rule:** The most restrictive dimension determines the overall posture. Viability is the gating dimension; a Not viable rating overrides all others.

## Numeric Score Mapping

Map categorical ratings to numeric scores using the following rules:

| Categorical rating | Numeric score | Rationale |
|--------------------|---------------|-----------|
| Viable | 4–5 | Project achieves goals; minor improvements possible |
| Conditional | 3 | Project achieves goals with known blocker |
| Not viable | 1–2 | Project cannot achieve goals without structural change |
| Complete | 4–5 | All documented behavior implemented |
| Partial | 3 | Some behavior missing |
| Broken | 1–2 | Core behavior contradicted |
| Scalable | 4–5 | Architecture absorbs growth |
| Bounded | 3 | Architecture supports growth to known limit |
| Fragile | 1–2 | Architecture breaks on growth |

A dimension with mixed findings should use the lower numeric bracket unless the positive findings are confirmed by automated baseline.
