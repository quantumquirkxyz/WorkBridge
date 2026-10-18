# Skills Map

```mermaid
mindmap
    root((quirk skills))
        Core flow
            ask-to
            grill
            project-development
            context-pack
            work-item-router
            to-spec
            to-tickets
            implement
            publish-open-pr
            issue-operations
            pr-operations
            review-pr
            review-fix-loop
            ship-subissue
        Quality and governance
            authorship
            quirk-method
            provenance
            skill-audit
            evaluate-skill
            lockfile-maintenance
            skill-quality-gate
            workflow-fixture-author
            side-effect-auditor
            knowledge-curator
            writing-great-skills
            execution-policy
            docs-management
            project-viability
            triage
            make-project
            setup-quirk-skills
        Platform
            frontend-design
            design-system
            webapp-testing
            api-design
            api-contracts
            auth
            deployment
            release-management
            observability
            testing
            performance
            system-design
            db-migrations
        Stack specializations
            nextjs
            react
            vercel
            postgres
            search
            backend-queues
            mobile
            payments
        Support
            artifact-handoff
            handoff
            prototype
            research
            tdd
            diagnosing-bugs
            resolving-merge-conflicts
            capability-router
            code-review
            wayfinder
            writing-great-skills
```

## Core flow

| Skill | Purpose |
|---|---|
| `ask-to` | Route to the right next step |
| `grill` / `grilling` / `grill-me` / `grill-with-docs` | Sharpen plans through interview |
| `project-development` | Evaluate project shape and starting point |
| `context-pack` | Build a minimal fresh context pack |
| `work-item-router` | Force reading the governance index before routing |
| `domain-modeling` | Build and sharpen domain model |
| `codebase-design` | Design deep modules and seams |
| `to-spec` | Turn conversation into a published spec |
| `to-tickets` | Break plan into tracer-bullet tickets |
| `implement` | Implement work from spec or tickets |
| `publish-open-pr` | Open a PR from an issue branch |
| `issue-operations` | Create, update, comment, label, assign, or close issue tracker items with evidence |
| `pr-operations` | Create or update pull requests, comments, labels, and reviewer requests with validation evidence |
| `review-pr` | Review PR against Standards and Spec axes |
| `review-fix-loop` | Orchestrate review-repair loop |
| `plan-review-fixes` | Convert review findings into a remediation plan |
| `implement-review-fixes` | Apply the planned review fixes |
| `ship-subissue` | Merge clean PR and close linked issue |

Canonical route: `setup-quirk-skills` once per repo, then `ask-to` when routing is unclear. For standard feature work, use `grill-with-docs` -> `to-spec` -> `to-tickets` -> `implement` -> `publish-open-pr` -> `review-pr`. If the review is dirty, `review-fix-loop` coordinates `plan-review-fixes` and `implement-review-fixes` until the PR is clean or blocked. `ship-subissue` owns merge, issue closure, and tracker completion only after a clean review.

## Quality and governance

| Skill | Purpose |
|---|---|
| `AUTHORSHIP.md` | Authorship and integrity rules |
| `../../explanation/quirk-method.md` | Method vocabulary and quality bar |
| `../../explanation/provenance.md` | Origin and redesign status |
| `skill-audit` | Audit bundle, lockfile, symlink parity |
| `evaluate-skill` | Evaluate skill against fixed scenarios |
| `lockfile-maintenance` | Reconcile `skills-lock.json` with canonical skill files |
| `skill-quality-gate` | Run and interpret schema, semantic, scenario, fixture, and side-effect gates |
| `workflow-fixture-author` | Author deterministic scenario and behavioral fixtures |
| `side-effect-auditor` | Audit side-effect, risk, trust tier, and dependency declarations |
| `knowledge-curator` | Keep context and ADRs coherent |
| `writing-great-skills` | Vocabulary and principles for skills |
| `execution-policy` | Decide whether a skill action is allowed |
| `docs-management` | Keep docs aligned with project shape |
| `project-viability` | Evaluate viability, functionality, and scalability against CONTEXT.md and ADRs |
| `triage` | Classify issues and PRs into durable states |
| `make-project` | Create and configure GitHub Projects |
| `setup-quirk-skills` | Configure repo for quirk workflows |

## Skill Lab

- `skill-creator`
- `skill-template-generator`
- `skill-testing-framework`
- `skill-dependency-graph`
- `rule-cataloger`
- `skill-diff-analyzer`
- `lockfile-maintenance`
- `skill-quality-gate`
- `workflow-fixture-author`
- `side-effect-auditor`
- `interactive-tutorial-builder`
- `skill-performance-metrics`
- `integration-playground`
- `contribution-workflow-optimizer`

These Skills share the `platform/skill-lab.mjs` command surface and use the
`.skill-sandbox/` directory for experiments before promotion.

## Workflow Operations and Quality Gates - 2026-09

Validated through `check-all.mjs` with 8 scenario fixtures and 4 behavioral fixtures.

| Skill | Purpose |
|---|---|
| `issue-operations` | Scoped issue creation, updates, comments, labels, assignment, and closure evidence |
| `pr-operations` | PR creation/update/comment/reviewer/label operations without merging |
| `lockfile-maintenance` | Missing, stale, extra, and mismatched skill lockfile entry repair |
| `skill-quality-gate` | Release readiness interpretation across schema, semantic, routing, placeholder, and side-effect checks |
| `workflow-fixture-author` | Deterministic scenario and behavioral fixture authoring |
| `side-effect-auditor` | Declared-vs-implied side-effect, risk, trust tier, and dependency audit |

These skills include reusable references for issue/PR operation summaries, provider mappings, quality-gate reports, fixture skeletons, side-effect expectations, and lockfile refresh.

## Platform

| Skill | Purpose |
|---|---|
| `frontend-design` | Production-grade frontend interfaces |
| `design-system` | Reusable UI tokens and components |
| `webapp-testing` | Test strategy for web apps |
| `api-design` | Small, durable API seam |
| `api-contracts` | Request/response contracts and versioning |
| `auth` | Authentication and authorization seam |
| `deployment` | Build, release, and rollback seam |
| `release-management` | Release train and CI handoff |
| `observability` | Logs, metrics, traces, SLIs, SLOs, dashboards, alerts, runbooks |
| `performance` | Latency, throughput, bottlenecks, capacity planning |
| `system-design` | End-to-end system architecture, scaling, reliability |
| `testing` | Test strategy and seams |
| `db-migrations` | Safe schema change sequencing |

## Graphic design

| Skill | Purpose |
|---|---|
| `graphic-design-foundations` | Composition, color, typography, and production requirements for graphic artifacts |
| `brand-identity` | Brand identity systems — logo, color, typography, imagery, iconography, and usage rules |
| `design-system-visual` | Visual design systems — tokens, components, patterns, and accessibility |
| `graphic-design-tools` | Connect Figma, Adobe CC, Canva, and local tools to agent workflows |
| `graphic-design-project-management` | Manage graphic design projects — briefs, iterations, reviews, handoff, versioning |
| `graphic-design-data-viz` | Charts, infographics, dashboards with accessibility and production rules |
| `graphic-design-motion` | Motion graphics, UI animations, Lottie, CSS animations with timing and performance rules |
| `graphic-design-packaging` | Physical packaging design — dielines, structure, materials, regulatory labels, and production specifications |
| `graphic-design-editorial` | Editorial layouts — magazines, books, reports, long-form content with grid systems, typography hierarchy, and production-ready pagination |
| `graphic-design-photo-direction` | Photography art direction and image retouching — lighting, composition, color grading, and post-production workflows for brand and product imagery |
| `graphic-design-advertising` | Advertising creatives — social ads, display ads, email banners, campaign visuals with brand consistency and conversion-focused layout rules |
| `graphic-design-accessibility` | Inclusive graphic artifacts — WCAG-compliant visuals, colorblind-safe palettes, readable typography, and assistive-technology-compatible layouts |

## Stack specializations

| Skill | Surface |
|---|---|
| `nextjs` | Next.js routes, server/client seams |
| `react` | React component structure and state |
| `vercel` | Vercel deployment and runtime |
| `postgres` | PostgreSQL schema and queries |
| `search` | Search indexing and relevance |
| `backend-queues` | Background jobs, queues, retries, idempotency |
| `mobile` | Device constraints, offline behavior |
| `payments` | Payment flows, reconciliation, rollback |

## New Domain Skills — Promoted from Sandbox (2026-09)

Validated via `skill-lab.mjs validate --json` (33 PASS, 2 FAIL excluded) and promoted to `.agents/skills/` with `.claude/skills/` symlinks.

| Skill | Domain / Subfield |
|---|---|
| `math-pure-proofs` | Pure math proofs (number theory, algebra, analysis) |
| `math-computational` | Numerical / symbolic computation |
| `math-optimization` | Optimization (LP, convex, MIP, combinatorial) |
| `math-linear-algebra` | Decompositions (SVD, eigendecomposition, least squares) |
| `math-probability-models` | Probability distributions, stochastic processes |
| `math-cryptography` | Cryptographic primitives and hardness assumptions |
| `physics-quantum` | Quantum mechanics, Dirac notation, measurement |
| `physics-classical` | Newton / Lagrangian / Hamiltonian mechanics |
| `physics-thermo` | Thermodynamics, cycles, entropy, phase transitions |
| `physics-astro` | Astrophysics, stellar dynamics, cosmology |
| `quant-factors` | Quantitative factor construction (momentum, value, carry) |
| `quant-backtest` | Backtest audit (biases, costs, out-of-sample) |
| `quant-derivatives-pricing` | Options / exotics pricing, Greeks, calibration |
| `quant-portfolio-opt` | Portfolio optimization (mean-variance, risk-parity, factor) |
| `quant-credit-risk` | PD/LGD/EAD, portfolio loss distribution, stress |
| `quant-market-micro` | Microstructure, execution costs, optimal execution |
| `quant-risk-modeling` | VaR / CVaR / drawdown / stress testing |
| `finance-corporate-val` | Corporate valuation (DCF, multiples, sum-of-parts) |
| `finance-dcf` | Discounted cash flow (forecast, WACC, sensitivity) |
| `finance-portfolio-theory` | MPT, CAPM, APT, performance attribution |
| `web3-smart-contracts` | Contract design, security audit, gas, upgrade |
| `web3-tokenomics` | Token economics, issuance, incentives, governance |
| `web3-consensus` | Consensus analysis (PoW, PoS, BFT, finality) |
| `web3-l2-scaling` | Rollups, validiums, DA, throughput / cost |
| `web3-defi` | AMM, lending, stablecoins, composability risk |
| `web3-governance` | On-chain / off-chain governance, voting, attacks |
| `db-relational-design` | Schema, keys, indexes, normalisation, migrations |
| `db-nosql-modeling` | Document / key-value / wide-column / graph / time-series |
| `cs-algorithms` | Algorithm design, correctness, complexity analysis |
| `scientific-hypothesis` | Hypothesis formulation, variables, statistical plan |
| `docs-adrs` | Architecture Decision Records |
| `pro-market-analysis` | TAM / SAM / SOM, competitive mapping, trends |

Provenance: `../../explanation/provenance.md` section "2026-09 — Sandbox-to-canonical promotion".

## Support

| Skill | Purpose |
|---|---|
| `artifact-handoff` | Transfer structured artifacts between skills |
| `handoff` | Compact conversation into handoff document |
| `prototype` | Build throwaway prototype to answer design question |
| `research` | Investigate a question against primary sources |
| `tdd` | Test-driven development |
| `diagnosing-bugs` | Diagnosis loop for hard bugs |
| `resolving-merge-conflicts` | Resolve conflicted or blocked branch state |
| `capability-router` | Route work by declared capabilities |
| `code-review` | Review changes against Standards and Spec |
| `wayfinder` | Plan huge work as a map of decision tickets |
| `writing-great-skills` | Reference for writing and editing skills |

## New Domain Skills — Second Promotion (Math + Physics specialist) 2026-09

Validated via `skill-lab.mjs validate --json` (15 PASS, 0 FAIL) and promoted to `.agents/skills/` with `.claude/skills/` symlinks.

### Math specialist (7)
| Skill | Domain / Subfield |
|---|---|
| `math-literature-track` | arXiv, MathSciNet, citation alerts |
| `math-formal-proof` | Lean/Coq/Isabelle/Agda proof development |
| `math-computation-reproducible` | SymPy/Mathematica/Magma/Sage/Julia + container |
| `math-teaching-problem-set` | Problem-set / exam design + rubric |
| `math-grant-structure` | NSF/ERC/Simons proposal drafting |
| `math-presentation-beamer` | Beamer / TikZ / speaker notes |
| `math-paper-collaboration` | Overleaf/GitHub collaboration + arXiv package |

### Physics specialist (8)
| Skill | Domain / Subfield |
|---|---|
| `physics-literature-search` | arXiv hep-th/cond-mat/astro-ph + INSPIRE + ADS |
| `physics-experimental-notebook` | Lab notebook / FAIR data / calibration |
| `physics-simulation-setup` | GEANT4, LAMMPS, VASP, QuTiP container |
| `physics-data-analysis-root` | ROOT / pandas / uproot + calibration / errors |
| `physics-writing-revtex` | RevTeX / APS / IOP / AIP formatting |
| `physics-talk-design` | Seminar / poster / public talk |
| `physics-career-postdoc` | Postdoc / faculty / grant applications |
| `physics-reproducibility-archive` | Zenodo DOI + GitHub release + FAIR checklist |

## New Domain Skills — Third Promotion (AI, Security, DevOps, Data, Product) 2026-09

Validated via `skill-lab.mjs validate --json` (19 PASS, 0 FAIL) and promoted to `.agents/skills/` with `.claude/skills/` symlinks.

### AI/ML (4)
| Skill | Subfield |
|---|---|
| `ai-ml-pipeline` | ML pipeline design (data, model, eval, deploy) |
| `ai-prompt-engineering` | LLM prompt design + evaluation |
| `ai-model-evaluation` | Metrics, fairness, robustness, explainability |
| `ai-time-series-forecasting` | Forecasting (ARIMA, Prophet, LSTM, Transformer) |

### Security (4)
| Skill | Subfield |
|---|---|
| `sec-security-audit` | Code / dependency / secret audit |
| `sec-threat-modeling` | STRIDE / ATT&CK threat modeling |
| `sec-privacy-engineering` | GDPR / CCPA / HIPAA compliance design |
| `sec-cryptography-applied` | Encryption, signatures, key management, TLS |

### DevOps (4)
| Skill | Subfield |
|---|---|
| `devops-k8s-orchestration` | Kubernetes architecture & policies |
| `devops-ci-cd-pipeline` | CI/CD pipeline design & rollback |
| `devops-terraform-iac` | Infrastructure as Code |
| `devops-feature-flags` | Feature flags, rollouts, kill switches |

### Data Engineering (3)
| Skill | Subfield |
|---|---|
| `data-etl-pipeline` | ETL / ELT design |
| `data-warehouse-modeling` | Star / snowflake / OBT schemas |
| `data-streaming` | Kafka / Kinesis / Flink streaming |

### Product (3)
| Skill | Subfield |
|---|---|
| `prod-prd-writing` | PRD, user stories, acceptance criteria |
| `prod-ab-testing` | A/B test design (power, metrics, rollback) |
| `prod-okr-planning` | OKR cycles (objectives, key results, initiatives) |
