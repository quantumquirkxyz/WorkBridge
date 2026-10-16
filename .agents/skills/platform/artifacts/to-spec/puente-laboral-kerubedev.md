# Puente Laboral Panamá — Market Matching and Training Roadmap

**Owner:** KerubeDev  
**Work type:** Epic slice  
**Scope:** Vacancy normalization, geographic constraints, deterministic matching, fairness checks, and training roadmap.

## Goals

- Normalize cached and manually imported vacancies into structured requirements.
- Detect ambiguous and discriminatory requirements before ranking.
- Rank vacancies for a candidate using the confirmed deterministic weights.
- Enforce transport, schedule, salary, capacity, and mandatory-skill constraints.
- Recommend a roadmap from a cached, specialization-aware training catalog.

## Non-Goals

- Replacing the human approval gates.
- Credential-provider implementation.
- Scraping LinkedIn directly from the application.
- Live course-platform scraping during every candidate search.

## Acceptance Criteria

- [ ] Vacancy input is validated as `JobRequirements` JSON and separates mandatory from desirable requirements.
- [ ] Requirements are normalized to canonical skills and preserve original wording.
- [ ] Alerts are classified as `ambiguous`, `potentially_discriminatory`, or `prohibited`.
- [ ] Clearly prohibited requirements are blocked; flagged requirements are excluded from ranking until human review.
- [ ] The matching solver applies weights of 30% technical requirements, 25% experience/evidence, 15% availability, 20% transport/accessibility, and 10% salary/conditions.
- [ ] Hard constraints override the score and can produce `not_currently_apt`.
- [ ] Scores map to `apt` for 75–100, `apt_with_gaps` for 50–74, and `not_currently_apt` for 0–49.
- [ ] A one-point boundary promotion is possible only when no better eligible candidate exists, no hard constraint is violated, and a human reviewer approves it.
- [ ] Ties use the confirmed deterministic order and never use protected attributes or randomness.
- [ ] Google Maps is used for route estimates; the local matrix is used as fallback and all geographic reasons are shown.
- [ ] The Training Agent ranks 15–30 cached opportunities by gap coverage, specialization, cost, duration, modality, geography, schedule, availability, and credential relevance.
- [ ] Roadmap output is validated as `Roadmap` JSON and contains only catalogued opportunities.

## Risks and Open Questions

- Google Maps or Apify may fail — use cached route and vacancy data with freshness warnings.
- A provider may return stale data — exclude vacancies older than 72 hours from automatic recommendation.
- A fairness rule may be ambiguous — require human resolution and audit the decision.

## Decisions

- **Seam:** `apps/agent-runtime` receives validated profiles and vacancies, then calls `packages/solver`; this makes deterministic matching the highest testable seam.
- **Solver:** `highs-js` with deterministic greedy fallback.
- **Vacancy refresh:** Apify Actor API updates the cache with 15–30 public LinkedIn vacancies; manual import remains available.
- **Testing:** Vitest solver/property tests, JSON fixtures, fairness invariance tests, and Playwright matching/roadmap scenarios.

## Validation Notes

- SC-01–SC-14 applied to this slice; all criteria have observable pass/fail evidence.
- Certo verification is consumed through its normalized contract and is not implemented in this slice.
