# Agent Runtime — Vacancy Normalization and Fairness

This package is the Market and Matching seam. This ticket delivers the vacancy
normalization and fairness pipeline; the Mastra workflow graph is added by its
own ticket (see spec #3).

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

## Validation

```bash
npm run lint          # eslint
npm run typecheck     # tsc --noEmit
npm test              # vitest (72 tests)
npm run test:coverage # vitest + v8 coverage (80% line threshold)
```

Fixtures live in `fixtures/vacancies/`: `objective.json` (valid objective
requirements), `good-appearance.json` (prohibited), `age-limit.json`
(unjustified age limit), `mixed.json` (all three severities), `free-text.json`
(description parsing), and `vendor-counter.pdf` (real PDF extraction).
