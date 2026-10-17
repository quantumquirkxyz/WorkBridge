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
`@puente/domain` (`packages/domain/src/schemas/job-requirements.schema.json`)
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
import { normalizeVacancy, getRankableRequirements } from "@puente/agent-runtime";

const document = await normalizeVacancy({ kind: "manual", vacancy });
if (document.status === "accepted") {
  const rankable = getRankableRequirements(document);
}
```

## Workflow, safety, and observability

```
POST /internal/workflow/runs
        │  JSON Schema 2020-12 + Ajv
        │  required trace_id, idempotency_key
        ▼
Mastra workflow
  exploration → profile_and_evidence → market_and_matching → training
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

## Validation

```bash
npm run lint          # eslint
npm run typecheck     # tsc --noEmit
npm test              # vitest (117 tests)
npm run test:coverage # vitest + v8 coverage (80% line threshold)
```

Fixtures live in `fixtures/vacancies/`: `objective.json` (valid objective
requirements), `good-appearance.json` (prohibited), `age-limit.json`
(unjustified age limit), `mixed.json` (all three severities), `free-text.json`
(description parsing), and `vendor-counter.pdf` (real PDF extraction).
