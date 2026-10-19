# Agent Runtime

This package hosts two seams:

- Market and Matching vacancy normalization and fairness (issue #5).
- The multi-agent workflow, safety, and observability plane (issue #9).

Candidate intake (#4) and credential verification (#6) stay outside this plane.
The workflow accepts candidate text and declared credential claims as ports.

## Seam

```
VacancyInput ──► extractVacancy ──► normalizeVacancy ──► JobRequirements (JSON Schema 2020-12, Ajv)
                                        │
                                        ├─ mandatory / desirable separation
                                        ├─ ESCO-based taxonomy mapping (original wording preserved)
                                        ├─ fairness alerts (ambiguous | potentially_discriminatory | prohibited)
                                        ├─ human-review routing
                                        └─ ranking eligibility (flagged requirements excluded)
```

`JobRequirements` is the contract. It is defined once in
`@workbridge/domain` (`packages/domain/src/schemas/job-requirements.schema.json`)
and validated with Ajv before it leaves this module.

## Inputs

| Kind | Shape | Notes |
|---|---|---|
| `manual` | `{ kind: "manual", vacancy: RawVacancy }` | Structured entry from staff. |
| `json` | `{ kind: "json", json }` | Structured buckets **or** a `{ title, description }` payload parsed as free text. |
| `pdf` | `{ kind: "pdf", data }` | Default adapter uses `unpdf` and reconstructs visual lines. |
| `image` | `{ kind: "image", data, mimeType? }` | Default adapter uses `tesseract.js`; tests inject a port. |

PDF and image extraction sit behind `VacancyExtractionPort`, so the suite stays
deterministic and offline while production uses the real adapters.

## Behavior

- **Mandatory vs desirable** is preserved from the input or a section heading
  (`Requisitos:` / `Deseables:`).
- **Taxonomy mapping** never rewrites the source text. `originalWording` is
  always kept; `canonical` carries `skillId`, ESCO reference label, taxonomy
  version, confidence, and match strategy.
- **Fairness alerts** are ordered by severity. `prohibited` wording blocks the
  vacancy; `ambiguous` and `potentially_discriminatory` wording is routed to
  `reviewQueue`; objective wording raises no alert.
- **Ranking exclusion** sets `rankingEligible: false` and
  `excludedFromRanking: true` on every flagged requirement.
  `getRankableRequirements` gives the solver the cleared set.
- **Resolution** (`resolveReview`) records the reviewer decision on the alert
  and reinstates an approved requirement for ranking.

## Usage

```ts
import { normalizeVacancy, getRankableRequirements } from "@workbridge/agent-runtime";

const document = await normalizeVacancy({ kind: "manual", vacancy });
if (document.status === "accepted") {
  const rankable = getRankableRequirements(document);
}
```

## Market matching (issue #20 solver seam)

`apps/agent-runtime` calls `@workbridge/solver` through `MatchingService`. The service
geocodes the candidate's home and each normalized vacancy location, projects the
domain documents onto the solver's contracts, then runs the deterministic matcher.

```
CandidateProfile + CandidateMatchContext ─┐
                                          ├─ MatchingService ─► @workbridge/solver
JobRequirements + VacancyMatchContext ────┘        │
                                                   ├─ geocode Location ─► GeoPoint
                                                   ├─ canonical skill-id bridge
                                                   └─ nominate | evaluateMatch ─► MatchDecision
```

- **Geocoding** (`matching/geocode.ts`): a `GeocodingPort` maps the textual domain
  `Location` onto a solver `GeoPoint`. The deterministic Panama catalog is the
  offline default; the Google Geocoding API answers when `GOOGLE_MAPS_API_KEY` is
  set. A provider failure falls back to the catalog with a recorded `fallbackReason`.
- **Routing**: the same key configures the Distance Matrix port. With no key,
  `createRoutingPort()` uses the local matrix, so matching runs fully offline.
- **Skill-id bridge**: the profile layer emits its own curated ids (`plp:*`) while
  vacancy requirements carry the ESCO-shaped ids (`PA-*`); `toSolverCandidate`
  re-matches each profile skill against the vacancy taxonomy so the mandatory
  comparison is meaningful.
- **Fairness**: only `getRankableRequirements` are projected, so flagged
  requirements stay out of ranking, and blocked vacancies are skipped, not scored.

Facts the solver needs that the profile/vacancy documents do not carry (schedule,
salary, capacity, transport, availability, home location) are supplied explicitly
through `CandidateMatchContext` / `VacancyMatchContext`; nothing is inferred.

```ts
import { createMatchingService, matchingConfigFromEnv } from "@workbridge/agent-runtime";

const config = matchingConfigFromEnv(process.env);
const matching = createMatchingService(config);

const decision = await matching.evaluatePair(profile, candidateContext, {
  document: jobRequirements,
  context: vacancyContext,
});
```

## Workflow, safety, and observability

```
POST /internal/workflow/runs
        │  JSON Schema 2020-12 + Ajv
        │  required trace_id, idempotency_key
        ▼
Mastra workflow
  exploration → profile_and_evidence → market_and_matching → bias_auditor → training
        │
        ├─ input, tool-result, permission, and output guardrails
        ├─ OpenRouter capability chains, token budgets, preflight, fallback
        └─ Langfuse spans, append-only audit_events, DQL lifecycle
```

`handleWorkflowRequest` is the internal REST adapter. `Accept: text/event-stream`
returns a `ReadableStream` that enqueues `envelope`, `lifecycle`, and `trace`
while the Mastra run is still in progress, then `result`. Any other accept
value returns JSON. A repeated `idempotency_key` replays the stored result.

Guardrail fixtures live in `fixtures/guardrails/cases.json` (10 cases): prompt
injection in a CV and in a scraped vacancy, PII leakage, invalid schema,
invented credentials, unauthorized tools, and a clean input. A forced primary
model failure promotes the next model in the capability chain. Exhausting the
chain records `pending → failed → retrying → dead_letter`.

### Employer shortlist (#100)

`GET /vacancies/:vacancyId/shortlist` ranks applications already received for
that vacancy by a freshly computed deterministic score, descending, with stable
candidate id, then submission id ties (candidate ids are not returned).
Each entry contains `rank`, `submissionId`,
`score`, `aptitude`, `gapSummary`, and `biasAlerts`. The browser endpoint is
`GET /api/applications/vacancies/:vacancyId/shortlist`.

The BFF uses the authenticated Better Auth cookie session. The runtime checks the
employer role and trusted vacancy ownership before reading applicant records;
another organization receives 403, and an unknown vacancy receives 404. For this
demo, the seeded catalog belongs to the seeded organization
`employer_org_<environment>`, using the same `AUTH_SEED_ENV` / `NODE_ENV` / default
`development` resolution as `scripts/seed-roles.ts`. Candidate-authored
`employerOrgId` and match scores cannot establish ownership or influence ranking.

Ranking loads the applicant's profile and preferences from the existing Postgres
tables, using the same `makeCandidateId` mapping as intake, and invokes the existing
matcher and counterfactual auditor. A finding that blocks the vacancy empties its
shortlist. Missing profile/preferences exclude that applicant; absent SQL storage
returns 503 when scoring is needed. Applications continue to use the existing
runtime submission registry. Tests can inject a trusted `ApplicationDecisionSource` in
`ApplicationServiceOptions`; it is never exposed as a request body.

## Validation

```bash
npm run lint          # eslint
npm run typecheck     # tsc --noEmit
npm test              # vitest (193 tests)
npm run test:coverage # vitest + v8 coverage (80% line threshold)
```

Fixtures live in `fixtures/vacancies/`: `objective.json` (valid objective
requirements), `good-appearance.json` (prohibited), `age-limit.json`
(unjustified age limit), `mixed.json` (all three severities), `free-text.json`
(description parsing), and `vendor-counter.pdf` (real PDF extraction).
