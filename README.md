# WorkBridge

<!-- Cambia el 0 por el número de su reto y deja la línea tal cual ("Reto: N"):
       1 = Agua · 2 = Educación · 3 = Empleabilidad
     No cambien de reto sin autorización de los organizadores. -->
Reto: 3

## Equipo

- Querube Ariza (@KerubeDev)
- Mateo Del Giudice (@MateoDG2006)
- Jhoumar Barria (@quantumquirkxyz)

## Problema

La transición de los estudios al primer empleo es difícil para jóvenes panameños. WorkBridge
conecta perfiles, vacantes y rutas de formación considerando habilidades técnicas y blandas,
experiencia informal, certificaciones, transporte, horario, salario y equidad.

## Arquitectura de agentes

The system uses four agents: Exploration, Profile and Evidence, Market and Matching, and Training.
Mastra coordinates them through a workflow graph. Deterministic matching uses HiGHS; Google Maps
handles routing; Certo is a separately deployed credential verifier with Accredible, Credly, and
transparent mock fallbacks. Human approval is required before application submission.
See the complete [agent architecture diagram](docs/reference/agents/architecture.md) for each
agent's tools, the data and execution planes, and all human approval points.

## Tecnologías y fuentes de datos

TypeScript, Next.js, Mastra, OpenRouter, PostgreSQL, Prisma, Better Auth, JSON Schema 2020-12,
Ajv, HiGHS, Google Maps, Apify LinkedIn Jobs scraper, Langfuse, Vitest, and Playwright.

## Instalación y ejecución

Requiere Node.js ≥ 22. El proyecto es un monorepo de npm workspaces (`packages/*`, `apps/*`).

```bash
npm ci
npm test
npm run typecheck
npm run gate:ci
npm run test:e2e
npm start
npm run dev
```

`npm run dev` abre el intake en http://localhost:3000. `npm start` levanta el servicio de
postulación. Los borradores y envíos con roles están en `docs/how-to/application-runtime.md`.
Las firmas asumidas de matching (#8) y del plano de workflow (#9) están en
`docs/reference/assumed-contracts.md`.

Copia `apps/web/.env.example` a `apps/web/.env.local` para configurar OpenRouter. Sin
`OPENROUTER_API_KEY` el intake usa el extractor heurístico determinista y aun así produce un
`CandidateProfile` válido. Copia `.env.example` a `.env` para la postulación local. No
commits de credenciales reales.

## Evals

Los resultados siguientes salen de aserciones existentes en Vitest; no son una
evaluación nueva ni datos generados manualmente. En verificación, la métrica es
el estado predicho (y el proveedor cuando aplica). En matching y perfil, es la
clasificación determinista comprobada por el test.

| Caso nombrado | Métrica | Resultado | Test fuente |
|---|---|---|---|
| Credencial válida, firma e issuer confiables | Estado / proveedor | `verified` / Certo | `apps/agent-runtime/test/ground-truth.test.ts` — `valid signature and trusted issuer` |
| Certificado revocado | Estado / proveedor | `rejected` / Certo | `apps/agent-runtime/test/ground-truth.test.ts` — `valid signature with revoked certificate` |
| Certificado expirado | Estado / proveedor | `rejected` / Certo | `apps/agent-runtime/test/ground-truth.test.ts` — `expired certificate` |
| Documento alterado | Estado / proveedor | `rejected` / Certo | `apps/agent-runtime/test/ground-truth.test.ts` — `altered document` |
| Firma inválida | Estado / proveedor | `rejected` / Certo | `apps/agent-runtime/test/ground-truth.test.ts` — `invalid signature` |
| Firmante desconocido | Estado / proveedor | `unverified` / Certo | `apps/agent-runtime/test/ground-truth.test.ts` — `unknown signer` |
| Identidad del issuer inconsistente | Estado / proveedor | `rejected` / Certo | `apps/agent-runtime/test/ground-truth.test.ts` — `inconsistent issuer identity` |
| Datos del certificado inconsistentes | Estado / proveedor | `rejected` / Certo | `apps/agent-runtime/test/ground-truth.test.ts` — `inconsistent certificate data` |
| Falta la clave pública | Estado / proveedor | `unverified` / Certo | `apps/agent-runtime/test/ground-truth.test.ts` — `missing public key` |
| Formato no soportado | Estado / proveedor | `unverified` / Certo | `apps/agent-runtime/test/ground-truth.test.ts` — `unsupported format` |
| Certo no disponible, fallback Accredible | Estado / proveedor | `verified` / Accredible | `apps/agent-runtime/test/ground-truth.test.ts` — `Certo unavailable with Accredible fallback` |
| Accredible no disponible, fallback Credly | Estado / proveedor | `verified` / Credly | `apps/agent-runtime/test/ground-truth.test.ts` — `Accredible unavailable with Credly fallback` |
| Todos los proveedores no disponibles | Estado / proveedor | `rejected` / mock | `apps/agent-runtime/test/ground-truth.test.ts` — `all providers unavailable` |
| Credencial declarada sin evidencia | Estado / proveedor | `declared` / mock | `apps/agent-runtime/test/ground-truth.test.ts` — `declared credential without evidence` |
| Credencial duplicada o reutilizada | Estado / proveedor | `rejected` / Certo | `apps/agent-runtime/test/ground-truth.test.ts` — `duplicate or reused credential` |
| Candidato fuerte elegible | Aptitud / score | `apt` / 87 | `packages/solver/src/__tests__/match.test.ts` — `produces apt for a strong eligible candidate` |
| Candidato parcialmente coincidente | Aptitud / score | `apt_with_gaps` / 50–74 | `packages/solver/src/__tests__/match.test.ts` — `produces apt_with_gaps for a partially matching candidate` |
| Candidato débil sin fallo duro | Aptitud / score | `not_currently_apt` / <50 | `packages/solver/src/__tests__/match.test.ts` — `produces not_currently_apt from the score band without a hard failure` |
| Experiencia demasiado breve | Relevancia | `requires_additional_evidence` | `packages/profile/tests/classify.test.ts` — `asks for more evidence when the description is too short` |
| Experiencia sin solapamiento | Relevancia | `not_relevant` | `packages/profile/tests/classify.test.ts` — `is not relevant when no skills overlap the target role` |
| Experiencia con solapamiento fuerte | Relevancia / score | `relevant` / ≥0.5 | `packages/profile/tests/classify.test.ts` — `is relevant for a strong overlap with the target role` |
| Experiencia con solapamiento débil | Relevancia | `partially_relevant` | `packages/profile/tests/classify.test.ts` — `is partially relevant for a weak overlap` |

El caso de ground truth de credenciales también comprueba los 15 estados contra
la matriz de confusión: `tp=3`, `tn=12`, `fp=0`, `fn=0`, precisión `1`, recall
`1`, false-positive rate `0`, false-negative rate `0` y fallback rate `3/15`.

## Bitácora de IA

### Herramientas usadas

La única herramienta generativa usada para este registro y para la asistencia de
implementación fue **OpenCode (GPT-5.6 Luna)**. OpenCode se usó para explorar el
repositorio, localizar fixtures y aserciones, proponer documentación y revisar
la consistencia de las referencias. Esta asistencia y la revisión final de la
trazabilidad quedan registradas en `.agents/skills/platform/artifacts/implement/102.md`
y en el commit `6d48081`. Las decisiones de producto, contratos, revisión de
cambios y escritura final fueron del equipo.

### Asistencia por área

| Área | AI-asistido | Hecho a mano por el equipo | Evidencia verificable |
|---|---|---|---|
| Intake | Explorar el código y localizar los puntos de extracción y persistencia. | Definir campos de perfil, contratos y el límite entre extracción heurística y OpenRouter. | `ef1ff1f` (persistencia de perfiles), `41a92b2` (fusión de fuentes), `.agents/skills/platform/artifacts/implement/4.md` |
| Matching | Explorar fixtures y revisar la documentación de resultados. | Escoger dimensiones, pesos, restricciones duras, estados de aptitud y fixtures deterministas. | `73e232a` (seam del solver), `cf35082` (decisiones para borradores), `.agents/skills/platform/artifacts/implement/2.md` |
| Verificación de credenciales | Revisar la matriz de casos y ubicar sus aserciones. | Definir evidencia declarada, binding del holder, estados y fallback Certo → Accredible → Credly → mock. | `8eea3e0` (credential verification), `.agents/skills/platform/artifacts/implement/56.md` |
| Web | Proponer la organización del registro y comprobar referencias de rutas y handlers. | Conectar rutas con servicios, validar entradas, aplicar autorización y decidir códigos/respuestas de error. | `493129a` (integración web), `7acb1e3` (ruta de intake), `.agents/skills/platform/artifacts/implement/32.md` |
| Docs | Localizar documentación existente y revisar enlaces y commits citados. | Redactar y mantener este registro, la tabla de evaluaciones y el diagrama de arquitectura. | `6d48081`, `.agents/skills/platform/artifacts/implement/102.md`, `bb86ef4`, `.agents/skills/platform/artifacts/implement/101.md` |

La tabla y este registro documentan resultados ya comprobados por la suite; este
ticket solo añade trazabilidad documental y no añade casos de prueba ni cambia
`npm test`; this scope statement is recorded in commit `45d8cac`.

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
