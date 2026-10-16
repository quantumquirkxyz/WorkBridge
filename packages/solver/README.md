# Solver — Deterministic Geographic Matching

This package is the deterministic matching seam named in spec #2:
`apps/agent-runtime` receives validated profiles and vacancies and calls
`@puente/solver`. It scores candidate/vacancy pairs, enforces hard constraints,
and nominates candidates with a HiGHS MILP plus a deterministic greedy fallback.

## Seam

```
SolverCandidate + SolverVacancy
        │
        ├─ routing  ──► Google Maps Distance Matrix ──(unavailable)──► local matrix
        │
        ├─ weighted score (30/25/15/20/10) ──► scoreBreakdown + reasons
        ├─ hard constraints ──► failedConstraints (override the score)
        ├─ one-point promotion (peer evidence + human approval)
        └─ MatchDecision (JSON Schema 2020-12, Ajv)

nominate(candidates, vacancies) ──► capacity-constrained assignment
        └─ HiGHS MILP ──(non-optimal / error)──► deterministic greedy fallback
```

`MatchDecision` is the contract, defined once in
`packages/solver/src/schemas/match-decision.schema.json` and validated with the
shared Ajv 2020-12 instance from `@puente/domain` before it leaves the module.

## Inputs

The solver defines its **own** input contract (`SolverCandidate`,
`SolverVacancy`) instead of importing ticket #4's `CandidateProfile`. This keeps
the scoring seam independently testable and lets the profile layer adapt onto it
once it lands (map `skills → CandidateSkillSignal`, availability/transport
preferences, and salary expectations).

## Scoring

| Dimension | Weight | Signal |
|---|---|---|
| Technical | 30% | Mandatory skills (full weight) + desirable skills (half weight), met fraction relative to the required level. |
| Experience / evidence | 25% | Experience level 0–4 plus relevant evidence depth. |
| Availability | 15% | Weekly schedule coverage plus hours headroom. |
| Transport / accessibility | 20% | Commute against the candidate's limit, and route accessibility. |
| Salary / conditions | 10% | Vacancy maximum against the candidate's floor and expectation. |

The weighted score is rounded to an integer 0–100. Hard-constraint failures are
reported in `failedConstraints` and force `not_currently_apt`, overriding the
score.

## Hard constraints

`mandatory_skills`, `mandatory_requirements_mapped`, `schedule`, `salary`,
`capacity`, `geographic_commute`, `geographic_accessibility`. A mandatory
requirement with no canonical `skillId` cannot be confirmed deterministically and
is treated as a failure rather than a silent pass.

## Aptitude and promotion

| Score | Aptitude |
|---|---|
| 75–100 | `apt` |
| 50–74 | `apt_with_gaps` |
| 0–49 | `not_currently_apt` |

The one-point promotion can lift `74 → 75` or `49 → 50`. It applies only when no
hard constraint is violated, **no better eligible candidate exists** for the
vacancy, and a human approves (`MatchOptions.approval` / `nominate.approvals`).
Without peer evidence the promotion is reported as ineligible, never applied
silently.

## Determinism

- Scoring is a pure function of the pair and the injected routing estimate.
- `tieBreakKey` and `compareDecisions` use only the score, the number of failed
  constraints, and the vacancy/candidate ids — never protected attributes or
  randomness.
- The greedy fallback sorts eligible pairs by score then vacancy/candidate id.
- HiGHS runs with `random_seed: 0` and `output_flag: false`.

## Usage

```ts
import { evaluateMatch, nominate, createRoutingPort, createGoogleMapsRouter } from "@puente/solver";

const routing = createRoutingPort({
  google: process.env.GOOGLE_MAPS_API_KEY
    ? createGoogleMapsRouter({ apiKey: process.env.GOOGLE_MAPS_API_KEY })
    : undefined,
});

const decision = await evaluateMatch(candidate, vacancy, { routing });

const result = await nominate({ candidates, vacancies, routing, approvals });
```

## Validation

```bash
npm run lint          # eslint
npm run typecheck     # tsc --noEmit
npm test              # vitest
npm run test:coverage # vitest + v8 coverage (80% line threshold)
```

Fixtures live in `fixtures/`: `metro-support.json` and `desirable-only.json`
(vacancies), plus `strong`, `mid`, `weak`, `credential-gap`,
`infeasible-transport`, and `schedule-conflict` candidates. They cover all three
aptitude states, infeasible transport, a schedule conflict, a mandatory
credential gap, the score-based `not_currently_apt` band, and the promotion
cohort.
