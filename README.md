# Puente Laboral Panamá

<!-- Cambia el 0 por el número de su reto y deja la línea tal cual ("Reto: N"):
       1 = Agua · 2 = Educación · 3 = Empleabilidad
     No cambien de reto sin autorización de los organizadores. -->
Reto: 3

## Equipo

- Querube Ariza (@KerubeDev)
- Mateo Del Giudice (@MateoDG2006)
- Jhoumar Barria (@quantumquirkxyz)

## Problema

La transición de los estudios al primer empleo es difícil para jóvenes panameños. Puente Laboral
Panamá conecta perfiles, vacantes y rutas de formación considerando habilidades técnicas y blandas,
experiencia informal, certificaciones, transporte, horario, salario y equidad.

## Arquitectura de agentes

The system uses four agents: Exploration, Profile and Evidence, Market and Matching, and Training.
Mastra coordinates them through a workflow graph. Deterministic matching uses HiGHS; Google Maps
handles routing; Certo is a separately deployed credential verifier with Accredible, Credly, and
transparent mock fallbacks. Human approval is required before application submission.

## Tecnologías y fuentes de datos

TypeScript, Next.js, Mastra, OpenRouter, PostgreSQL, Prisma, Better Auth, JSON Schema 2020-12,
Ajv, HiGHS, Google Maps, Apify LinkedIn Jobs scraper, Langfuse, Vitest, and Playwright.

## Instalación y ejecución

Installation and demo instructions will be added with the implementation. Use `.env.example`; never
commit real credentials.

## Evals

Al menos 15 casos de prueba, métrica y resultados.

## Bitácora de IA

Qué partes se hicieron con IA, con qué herramienta y qué se modificó a mano.

---

Entrega: tag de git `final-24h` sobre el último commit válido, al cumplirse la hora 24.

# Agent-Hackathon

Working repository for an agent-focused build, developed with the
[quirk Skills](https://github.com/quantumquirkxyz/skills-quirk) workflow.

## How this repo is organized

| Path | Purpose |
|---|---|
| `.agents/skills/` | Canonical quirk Skills bundle (repository-local workflow) |
| `.claude/skills/` | Compatibility symlink view of the canonical skills |
| `skills-lock.json` | SHA-256 integrity hashes for the canonical skills |
| `CONTEXT.md` | This project's domain vocabulary and boundaries |
| `.agents/adr/` | Architecture Decision Records |
| `docs/reference/agents/` | Work-item, routing, and tracker governance |
| `docs/how-to/` | Adoption, installation, and workflow guides |
| `docs/explanation/` | The quirk method and its provenance |

## Workflow

Work moves through the quirk flow: **clarify → plan → build → review → deliver**.

1. `ask-to` — route an ambiguous request.
2. `grill-with-docs` — sharpen the idea, record `CONTEXT.md` and ADRs.
3. `to-spec` → `to-tickets` — publish the spec and claimable tickets.
4. `implement` → `publish-open-pr` — build and open the pull request.
5. `review-pr` → `ship-subissue` — review, repair, then ship.

## Validation

```bash
node .agents/skills/platform/check-all.mjs   # expected: status: "pass"
```

## Status

Bootstrapped: the skills bundle is installed and validated. The project brief and domain
vocabulary are **not yet defined** — see `CONTEXT.md`.

## License

MIT — see [LICENSE](LICENSE).
