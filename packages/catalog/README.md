# Catalog — Cached Vacancies and Preference Exploration

This package is the cached-vacancy seam named in spec #1 (ticket #7):
`apps/agent-runtime` and `apps/web` hand validated `CandidatePreferences` to
`@workbridge/catalog`, which queries the cached catalogue and returns compatible
vacancies with provenance and freshness. It does **not** rank candidates or
submit applications.

## Seam

```
CandidatePreferences (@workbridge/domain)
        │
        ▼
exploreVacancies(preferences, catalog)  ──► ExplorationResult (JSON Schema 2020-12, Ajv)
        │                                         ├─ matches: CachedVacancy + provenance + freshness
        │                                         ├─ excluded: reason (stale/modality/location/salary/contract/schedule)
        │                                         └─ summary
        │
   computeFreshness  ──► stale when age > 72 h (excluded from automatic recommendation)
```

`CandidatePreferences` and the shared enums (`work_modality`, `contract_type`,
`transport_mode`, `location`) live in `@workbridge/domain`. `CachedVacancy` and
`ExplorationResult` are defined once here, validated by the shared Ajv 2020-12
instance from `@workbridge/domain` before anything leaves the module.

## Preserved scraper facts

`toCachedVacancy` normalizes one raw scraped record (e.g. from the Apify
LinkedIn Jobs actor) while carrying four facts through unchanged:

- `jobId`
- `jobUrl`
- `queriedAt` — the query date
- `scrapingInfo` — the scraper's own bookkeeping (provider, query, `scrapedAt`, run id, source job id, page url)

Everything else (modality, contract, salary, schedule, skills, location) is
normalized with explicit defaults. `loadCatalogFromScraped` maps a raw array
onto a catalogue.

## Freshness

`computeFreshness(vacancy, { now, maxAgeHours = 72 })` measures the age from
`postedAt` (not from when the item was cached) and returns
`{ ageHours, maxAgeHours, stale, label }`, where `label` is dashboard-ready
Spanish. Stale vacancies are excluded **before** any compatibility check, so
they can never be recommended automatically.

## Exploration filters

In order: stale → modality → location → internship/contract → schedule →
salary. Excluded vacancies carry a Spanish `detail`. Matches are scored 0–100
from skill affinity (40%), salary fit (20%), schedule overlap (20%), and
freshness (20%), then sorted by score, then freshness, then `jobId` — a fully
deterministic order.

## Usage

```ts
import { createVacancyCatalog, exploreVacancies, type CachedVacancy } from '@workbridge/catalog';

const catalog = createVacancyCatalog(records);
const result = exploreVacancies(preferences, catalog, { now: () => new Date() });
```

## Validation

```bash
npm run typecheck
npm test            # includes packages/catalog/tests
npm run test:coverage
```
