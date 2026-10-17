# Training — Specialization-Aware Roadmap

This package is the deterministic training seam named in spec #2 / ticket #11.
It consumes a **cached** catalog snapshot plus a candidate's gaps and produces a
validated `Roadmap` JSON. It never calls an LLM and never invents an
opportunity: every recommendation embeds the exact catalog entry it came from.

## Seam

```
TrainingGap[]  +  TrainingCatalog (cached snapshot)  +  TrainingPreferences
        │
        ├─ deriveGaps (from ticket #8 SolverCandidate/SolverVacancy)
        ├─ rankOpportunities ──► nine-criteria score + Spanish reasons
        ├─ selectRoadmap ──► deterministic greedy set cover
        └─ Roadmap (JSON Schema 2020-12, Ajv)
```

The Training Agent refreshes the catalog out of band; this package only reads
the last valid snapshot. `TrainingCatalog` and `Roadmap` are the contracts,
validated with the shared Ajv 2020-12 instance from `@puente/domain` before they
leave the module.

## Inputs

- `TrainingCatalog` — 15–30 courses, certifications, projects, and internships,
  each with provider, type, URL, cost, duration, modality, location, schedule,
  seats, covered skills, prerequisites, credential relevance, source, and
  `retrievedAt` (freshness).
- `TrainingGap[]` — produced by `deriveGaps` from the ticket #8 solver output,
  or supplied directly. Each gap keeps the required and current level, the kind
  (`technical`, `soft`, `language`), and whether it is mandatory.
- `TrainingPreferences` — target specializations, cost and duration ceilings,
  preferred modalities, weekly availability, home location, and a commute
  budget.

## Ranking

| Dimension | Weight | Signal |
|---|---|---|
| Gap coverage | 30% | Fraction of the outstanding gap levels the opportunity can address (partial coverage counts). |
| Specialization | 15% | Share of the candidate's target areas the opportunity matches. |
| Cost | 12% | Free is best; the ceiling scores 60; over the ceiling is 0 (and excluded). |
| Duration | 8% | Shorter is better relative to the effort ceiling. |
| Modality | 8% | Preferred modalities score 100; other usable modalities score 50. |
| Geography | 7% | Online is free; on-site uses an offline haversine estimate; unknown is neutral. |
| Schedule | 8% | Weekly window coverage against the candidate's availability. |
| Availability | 5% | Open seats, saturating at five. |
| Credential relevance | 7% | Employability value of the resulting credential. |

The weighted score is rounded to an integer 0–100. Ties break by opportunity id
(UTF-16 code unit order), so the order never depends on input order, locale, or
randomness.

## Selection

`selectRoadmap` is a deterministic greedy set cover: repeatedly take the
opportunity that addresses the most outstanding gap levels, subject to:

- target specialization (an opportunity that shares none with the candidate's
  targets is excluded);
- seats available (`>= 1`);
- cost ceiling and running budget;
- duration ceiling and running budget (a zero ceiling means a zero budget);
- schedule compatibility with the candidate's availability;
- catalog freshness (expired entries, more than 72 h old, are excluded);
- prerequisites, which can be unlocked by an earlier pick (a prerequisite chain
  is therefore selectable across rounds).

Ties between picks break by ranking score and then opportunity id. Gaps that no
catalogued opportunity can close are reported in `unresolvedGaps`.

## Freshness

| State | Age |
|---|---|
| `fresh` | less than 24 h |
| `stale` | 24–72 h (usable with a warning) |
| `expired` | more than 72 h (excluded from recommendations) |

## Usage

```ts
import { deriveGaps, buildRoadmap, loadCatalog } from "@puente/training";

const catalog = loadCatalog(snapshot); // validates TrainingCatalog
const gaps = deriveGaps({ candidate, vacancy }); // ticket #8 solver contracts

const roadmap = buildRoadmap(
  {
    candidateId: candidate.candidateId,
    targetVacancyId: vacancy.vacancyId,
    aptitude: decision.aptitude,
    gaps,
    preferences: { specializations: ["it_support"], maxCostUsd: 50 },
  },
  catalog,
);
```

## Validation

```bash
npm run lint          # eslint
npm run typecheck     # tsc --noEmit
npm test              # vitest
npm run test:coverage # vitest + v8 coverage (80% line threshold)
```

Fixtures live in `fixtures/`: `catalog/panama-training-catalog.json` (21
opportunities across `it_support`, `customer_service`, and `administration`)
and `requests/` for missing technical skills, soft-skill gaps, cost limits,
schedule conflicts, and no available catalog option.
