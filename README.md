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

La transición de los estudios al primer empleo es difícil para los jóvenes panameños, y el
problema es de información en tres lados. Los jóvenes no saben traducir su experiencia
informal (ayudar en el negocio familiar, un voluntariado) al lenguaje de una empresa ni qué
curso cierra su brecha. Las empresas reciben postulaciones que no encajan y publican ofertas
con requisitos vagos o discriminatorios. Los centros de formación ofrecen cursos que no
siempre llegan a quien más los necesita. A esto se suma la geografía: una oferta en Tocumen
puede ser inviable para alguien de La Chorrera por traslado y costo de transporte.

WorkBridge conecta perfiles, vacantes y rutas de formación considerando habilidades técnicas
y blandas, experiencia informal, certificaciones, transporte, horario, salario y equidad, con
una persona orientadora que aprueba las decisiones sensibles.

## Qué hace

1. **Intake conversacional**: la persona joven cuenta lo que sabe hacer (o sube un CV en PDF o
   foto) y el sistema arma un perfil con evidencia, incluida la experiencia informal.
2. **Matching explicable**: un solver determinista decide *apta*, *apta con brechas* o *no apta
   por ahora* para cada vacante, con las brechas, el traslado y las restricciones duras.
3. **Ruta de formación**: convierte las brechas en un plan ordenado de cursos.
4. **Postulación asistida**: genera el borrador (CV, carta y evidencia) que la persona revisa,
   corrige y aprueba.
5. **Aprobaciones humanas**: orientador y empresa deciden con la explicación a la vista.

## Arquitectura de agentes

Cinco agentes con roles distintos, coordinados por un grafo de Mastra, más un coach de
entrevista simulada fuera del grafo. El detalle, con diagrama, herramientas y puntos de
aprobación humana, está en **[docs/arquitectura.md](docs/arquitectura.md)**.

| Agente | Rol |
|---|---|
| Exploration | Valida preferencias y explora el catálogo de vacantes |
| Profile and Evidence | Convierte CV y experiencia en un perfil con evidencia |
| Market and Matching | Normaliza la vacante y decide aptitud (HiGHS, restricciones duras) |
| Bias Auditor | Repite el matching cambiando nombre, género o corregimiento y bloquea ofertas discriminatorias |
| Training | Convierte brechas en una ruta de formación |

- **Herramientas que actúan**: escritura en base de datos, solver de asignación, verificación
  de credenciales y registro de notificaciones salientes en un outbox SQL.
- **Componente determinista**: matching, restricciones, puntaje, rutas y verificaciones son
  código; el modelo de lenguaje no decide restricciones duras.
- **Humano en el ciclo**: la persona candidata aprueba su postulación, el orientador revisa
  los casos con brechas críticas, credenciales sin verificar, alertas de sesgo o traslado
  inviable, y la empresa decide el avance a entrevista. Ningún agente envía postulaciones.
- **Trazabilidad**: envelopes por decisión, ingesta opcional a Langfuse y un registro de
  auditoría append-only.

## Tecnologías

TypeScript (Node.js ≥ 22), Next.js 16 y React 19, Mastra, OpenRouter (modelos de lenguaje),
PostgreSQL con Neon, Better Auth, JSON Schema 2020-12 con Ajv, HiGHS (solver MILP), Google
Maps (geocodificación y traslados), Langfuse (trazas), Tesseract y unpdf (OCR y PDF), Vitest y
Playwright. Certo es un verificador de credenciales que se despliega por separado; con
Accredible, Credly y un mock transparente como respaldo.

## Fuentes de datos

- **Vacantes**: catálogo propio cargado desde ofertas de portales (extracción con el scraper de
  LinkedIn Jobs de Apify) y *fixtures* documentados en el repositorio (`packages/catalog`).
- **Formación**: catálogo de cursos del repositorio (`packages/training`).
- **Traslados**: Google Maps cuando hay clave; si no, datos deterministas de demostración.
- **Credenciales**: Certo, Accredible y Credly, con fallbacks documentados.

Fuentes externas que sustentan el problema: **pendientes de completar** (no se inventan cifras).

| Dato | Fuente | Fecha de consulta | Uso |
|---|---|---|---|
| Desempleo juvenil | Pendiente: fuente oficial panameña | — | Justificación del problema |
| Transporte y tiempos de traslado | Pendiente | — | Restricción de matching |
| Cursos y cupos | Pendiente: INADEH u otra fuente verificable | — | Ruta de formación |
| Vacantes | Catálogo y *fixtures* del repositorio (`packages/catalog`) | — | Demo y evals |

## Instalación y ejecución

Requiere Node.js ≥ 22. Es un monorepo de npm workspaces (`packages/*`, `apps/*`).

```bash
npm ci
cp .env.example .env                       # servicio de postulación y semillas
cp apps/web/.env.example apps/web/.env.local   # aplicación web
npm run db:migrate                         # esquema en Postgres (requiere el CLI de Neon)
npm run seed:roles                         # cuentas de orientador y empresa
npm run seed:demo                          # datos de demostración
npm run dev                                # web en http://localhost:3001
npm start                                  # servicio de postulación (agent-runtime)
npm run start:worker                       # worker del chat asíncrono
```

Sin `OPENROUTER_API_KEY` el sistema usa el extractor heurístico y los *fallbacks*
deterministas: sigue produciendo perfiles y decisiones válidos. Sin `DATABASE_URL` no hay
sesiones, chat ni persistencia. Los detalles de despliegue (Docker, Vercel, variables) están
en **[docs/metodologia.md](docs/metodologia.md)**.

### Credenciales de demo

No hay claves reales en el repositorio: copia siempre los `.env.example`. Las cuentas de
demostración (personas jóvenes, orientadores y empresas) y su contraseña compartida se crean
con `npm run seed:demo` a partir de `scripts/seed/demo-data.ts`; son datos de demostración, no
credenciales de ningún servicio real. Las claves de OpenRouter, Google Maps, Langfuse y Certo
son opcionales y se configuran solo por variables de entorno.

Todas las cuentas de `seed:demo` usan la contraseña `Semilla2026!`. Las postulaciones no
quedan guardadas en la base: se arman al usar la cuenta.

Empresas con vacante publicada en el catálogo (`packages/catalog/fixtures/vacancy-catalog.json`):

| Usuario | Empresa |
|---|---|
| rosa.mendez@seed.workbridge.test | Banco Delta |
| carlos.vidal@seed.workbridge.test | Supermercado Central |
| laura.quiel@seed.workbridge.test | Consultora Istmo |
| helena.ponce@seed.workbridge.test | Farmacias Del Istmo |
| andres.cedeno@seed.workbridge.test | Grupo Mar |
| miriam.batista@seed.workbridge.test | Ferretería El Tornillo |

El resto de empresas del seed no tiene vacante en el catálogo.

Estudiantes con perfil completo (experiencia y estudios) y una vacante del catálogo con la que coinciden:

| Usuario | Vacante |
|---|---|
| camila.ortega@seed.workbridge.test | Atención al cliente en la ciudad |
| diego.sanchez@seed.workbridge.test | Caja de fin de semana |
| valeria.perez@seed.workbridge.test | Asistencia administrativa remota |
| kevin.batista@seed.workbridge.test | Ventas en Arraiján |
| sofia.herrera@seed.workbridge.test | Pasantía de ventas |
| elena.castillo@seed.workbridge.test | Atención al cliente, con búsquedas guardadas |

### Pruebas

```bash
npm test               # Vitest: unitarias y de componentes
npm run typecheck
npm run gate:ci        # lint + typecheck + cobertura
npm run test:e2e       # Playwright
```

The runtime project uses a legacy memory-only fixture for its service lifecycle tests;
the ownership project uses the trusted runtime and requires persisted profile/preferences.

The seeded UI-to-employer ownership regression uses a trusted runtime with
`DATABASE_URL` configured for persisted profile/preferences, plus
`E2E_CANDIDATE_STORAGE_STATE`,
`E2E_EMPLOYER_STORAGE_STATE`, `E2E_FOREIGN_EMPLOYER_STORAGE_STATE`,
`E2E_CATALOG_VACANCY_ID`, and `E2E_OTHER_ORG_SUBMISSION_ID` after `npm run seed:demo`; run it with
`npx playwright test --project=ownership ui-to-employer-ownership.spec.ts`.

## Evals

Catálogo de **99 casos** en 7 temas (verificación de credenciales, matching, perfil y
experiencia informal, equidad y sesgo, guardrails de entrada, autorización y aprobación
humana, robustez), cada uno enlazado a un test existente. Ejecución del 2026-10-17: **855
pruebas, 844 aprobadas, 1 fallida y 10 omitidas**. La fallida es
`apps/web/tests/chat-worker.test.ts` y también falla en `main`. Las 8 evals con LLM en vivo
están omitidas por defecto, así que los comportamientos que solo ellas cubren (rechazo de
"postúlame a esa", entradas abusivas, no inventar salarios) no están verificados en esa
corrida. En credenciales, la matriz de confusión de 15 estados da precisión y recall 1.
Detalle, métricas, comandos y límites en **[docs/evals.md](docs/evals.md)**.

## Bitácora de IA

Se usó IA a lo largo de todo el proyecto: Cursor (49 commits con coautoría en `main`), Claude (8
commits con coautoría en `main`, 9 contando el de archivo de documentación de esta rama, y la
sesión de refactorización visual y cierre), OpenCode, Codex y otros modelos, con
revisión y decisiones del equipo. Qué se hizo con IA, con qué herramienta, qué no se puede
determinar y qué incidentes hubo: **[docs/bitacora-ia.md](docs/bitacora-ia.md)**.

## Demo

Guion de **menos de 3 minutos** (intake, matching, ruta, postulación y aprobaciones humanas),
preparación, plan B y checklist de entrega: **[docs/runbook-demo.md](docs/runbook-demo.md)**.
Estado: es un guion; el video aún **no está grabado ni enlazado** y el ensayo cronometrado
de punta a punta **no se ha hecho** (el tiempo del guion, 2:52, es un presupuesto).
Enlace al video: _pendiente_.

## Estado y límites conocidos

- La aplicación web no se ha ejecutado de punta a punta en un entorno limpio desde la
  refactorización visual; la verificación se apoya en tests y en lectura de código.
- La web no pasa por el grafo de cinco agentes (`WorkflowRuntime`): llama a los agentes de
  perfil y exploración, al servicio de matching y a la ruta de formación por separado, y el
  auditor de sesgo contrafactual no corre en ese flujo. Detalle en
  [docs/arquitectura.md](docs/arquitectura.md#7-limitaciones-conocidas).
- Un borrador creado desde la interfaz no lleva la organización de la empresa, así que la
  empresa podría no verlo; no se ha ensayado (ver el runbook, sección 6.3).
- Borradores y envíos de postulación viven en memoria en `agent-runtime`; solo la
  idempotencia y el outbox usan SQL.
- Hay pruebas y chequeos rojos en `main` que no son de la entrega: `chat-worker.test.ts`, errores de
  tipos en `service.ts` y `server.test.ts`, y `check-all.mjs` falla por un archivo de política
  ausente (`policy/tool-risk-budget.json`).
- Las credenciales que estuvieron versionadas en `apps/web/.env.local` siguen expuestas en el
  historial: **hay que rotarlas** y purgar el historial (`scripts/purge-leaked-env.sh`).
  Quitar el archivo del repositorio (PR #106) solo evita nuevas filtraciones.
- Sin integraciones reales de WhatsApp ni notas de voz de salida.

## Congelamiento

**Estado: el tag `final-24h` está creado y publicado.** Es un tag anotado sobre el último
commit válido de la entrega: el commit que incluye esta sección. Lo que se commitee después
del tag no cuenta para la evaluación. Para comprobarlo:

```bash
git tag -l final-24h
git rev-parse final-24h^{commit}    # hash del commit congelado
git show --stat final-24h
```

## Documentación

Todo el material de la entrega está en [`docs/`](docs/README.md). La documentación anterior
(método quirk Skills, gobernanza de issues, guías, referencias de frontend y la galería de
previews) se conserva en [`docs/old/`](docs/old/README.md).

## Licencia

MIT. Ver [LICENSE](LICENSE).
