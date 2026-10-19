# WorkBridge: metodología, despliegue y operación

> Reto 3, empleabilidad juvenil en Panamá. Documento de metodología exigido por el reto: cómo trabajó el equipo, cómo funciona el sistema, cómo desplegarlo y operarlo. Documentos hermanos: [arquitectura](arquitectura.md) (diagrama), [evals](evals.md), [bitácora de IA](bitacora-ia.md), [runbook de la demo](runbook-demo.md).

Todo lo que sigue se verificó contra el repositorio (`package.json`, `Dockerfile`, `vercel.json`, `migrations/`, `.env.example`, código). Donde algo no está en verde o no se pudo comprobar, se dice de forma explícita (secciones 2.6 y 7).

## 1. Resumen y alcance

WorkBridge es un sistema multiagente de empleabilidad para jóvenes en Panamá. Evalúa si una persona es apta para una vacante, reconoce experiencia formal e informal, identifica brechas, propone una ruta de formación y prepara postulaciones que siempre pasan por aprobación humana. Participan tres roles: **candidato**, **orientador** (counselor) y **empresa** (employer).

Alcance entregado:

- Monorepo TypeScript (Node.js >= 22, npm workspaces `packages/*` y `apps/*`).
- `apps/web`: experiencia Next.js (chat guiado, perfil, ruta, postulaciones, vistas de empresa y orientador) con autenticación Better Auth.
- `apps/agent-runtime`: workflow Mastra de agentes y servidor HTTP de postulaciones (borradores, aprobaciones, envíos, auditoría).
- `packages/*`: dominio y contratos (`domain`), ingesta de vacantes (`ingestion`), perfil (`profile`), catálogo de vacantes y cursos (`catalog`), solver de asignación con HiGHS (`solver`) y rutas de formación (`training`).

Fuera de alcance: integración de producción con Certo (se usa un adaptador con mock transparente cuando no está disponible) y canales de notificación externos (solo bandeja `in_app`). El pipeline de CI en la nube ejecuta `gate:ci`; lint y e2e permanecen como trabajo separado (ver sección 7).

## 2. Metodología de trabajo del equipo

### 2.1 Método quirk Skills

El equipo trabajó con el bundle **quirk Skills** (instalado en `.agents/skills/`; `.claude/skills/` es una vista de compatibilidad; decisión en [ADR-0001](../.agents/adr/0001-adopt-quirk-skills.md)). Principios: contexto antes de actuar, preguntas antes de compromisos, artefactos duraderos en vez de memoria, rebanadas verticales, medir antes de reparar y fallar de forma cerrada ante la incertidumbre. El vocabulario propio del proyecto vive en `CONTEXT.md`.

Flujo canónico, de la idea a la entrega:

| Fase | Skill | Qué produce |
|---|---|---|
| Aclarar | `grill-with-docs` | Preguntas contra el dominio y ADRs; decisiones difíciles de revertir quedan como ADR |
| Planificar | `to-spec`, `to-tickets` | Especificación publicada como issue y tickets pequeños, reclamables y trazables |
| Construir | `implement` | Una rebanada vertical con pruebas, más un artefacto de implementación |
| Entregar | `publish-open-pr` | PR vinculado al issue con evidencia de validación |
| Revisar | `review-pr` | Dos ejes **independientes**: *Standards* (convenciones, calidad, seguridad) y *Spec* (cumple lo prometido por la especificación) |
| Reparar | `review-fix-loop` (con `implement-review-fixes`) | Plan de reparación y correcciones acotadas; vuelve a `review-pr` hasta quedar limpio |
| Cerrar | `ship-subissue` | Merge y cierre del sub-issue solo con revisión limpia y validación conocida |

Si una rama del PR tiene conflictos se resuelven primero (`resolving-merge-conflicts`) y luego se retoma la revisión. Esto es lo que se ve en la historia de git: commits `docs(implement): ...`, `docs: record clean review loop for issue 62`, `docs(implement-review-fixes): record PR 86 fixes`, y fusiones de PR numerados.

### 2.2 Flujo de issues y PR en GitHub

- Repositorio de trabajo: `HackathonFISC/equipo-02` ([ADR-0009](../.agents/adr/0009-name-workbridge-and-equipo-02-tracker.md)).
- Cada funcionalidad nace como issue/especificación, se divide en sub-issues y cada sub-issue se implementa en una rama propia (`feat/issue-N-...`, `docs/issue-N-...`) con un PR que referencia el número, por ejemplo #101 (diagrama de agentes), #106 (seguridad), #115 (chat asíncrono), #116 (Langfuse), #117 (preselección de empresa).
- Se integra a `main` solo después de revisión por los dos ejes.

### 2.3 Decisiones y artefactos

- **ADRs** en `.agents/adr/` (índice en `.agents/adr/README.md`): 0001 adopción del método, 0002 límites del sistema, 0003 verificación por capas y aprobación humana, 0004 catálogo de vacantes, 0005 ruta de formación consultiva, 0006 chat guiado de ingreso, 0007 Tailwind y shadcn/ui, 0008 autorización por organización de empresa, 0009 nombre y tracker.
- **Artefactos por issue** en `.agents/skills/platform/artifacts/` (subcarpetas `grill-with-docs`, `to-spec`, `to-tickets`, `implement`, `implement-review-fixes`, `review-fix-loop`, entre otras; archivos `N.md`/`N.json` por número de issue). Son la memoria durable que permite a otro agente (o a un juez) reconstruir qué se decidió y qué se validó.
- Bitácora de uso de IA: [bitacora-ia.md](bitacora-ia.md).

### 2.4 Compuertas humanas del proceso

1. Las decisiones de diseño duras pasan por `grill-with-docs` con una persona y quedan en ADR.
2. Un PR no se fusiona sin pasar `review-pr` (Standards y Spec).
3. Acciones externas (push, merge, purga de historial, rotación de credenciales) las ejecutan personas; los agentes no las hacen por su cuenta.
4. En el producto: ninguna postulación se envía sin aprobación (sección 3 y 6).

### 2.5 Compuertas de calidad

Scripts reales del `package.json` raíz:

| Comando | Qué hace |
|---|---|
| `npm run typecheck` | `tsc --noEmit` sobre todo el monorepo |
| `npm run lint` | `eslint .` |
| `npm test` | `vitest run` (unitarias e integración) |
| `npm run test:coverage` | `vitest run --coverage` |
| `npm run gate:ci` | `typecheck` + `test:coverage` |
| `npm run verify` | `lint` + `typecheck` + `test` |
| `npm run test:e2e` / `test:e2e:web` | Playwright (proyectos `runtime` y `web`; usan puertos 4371/4372, memoria, sin LLM ni base real, y axe para accesibilidad) |
| `node .agents/skills/platform/check-all.mjs` | Validación del bundle de skills (estructura, semántica, escenarios) |

### 2.6 Estado actual: lo que NO está en verde (verificado el 2026-10-17)

Se ejecutaron las comprobaciones en este árbol de trabajo. Resultado honesto:

- **`apps/web/tests/chat-worker.test.ts` falla** (1 de 10 pruebas): "commits the chat session and only then marks the job succeeded". La respuesta recibida antepone el saludo de bienvenida de WorkBridge al texto esperado (`¿Seguimos con tu perfil?`). Las otras 9 pasan. Parece una expectativa desactualizada tras la migración a chat asíncrono (#115), no un fallo de persistencia; no se corrigió en esta entrega.
- **`gate:ci` pasa** con typecheck y cobertura en el workflow de GitHub Actions. `npm run lint` permanece fuera del gate por los 26 errores legacy de `docs/old/design/previews/*`; la cobertura e2e requiere levantar web y runtime.
- **`node .agents/skills/platform/check-all.mjs` se interrumpe** con `ENOENT` al leer `policy/tool-risk-budget.json`: el directorio `policy/` no existe en el repositorio. Es una validación del bundle de método, no del producto.
- No se verificó `npm run lint` ni Playwright en esta pasada; no se afirma que pasen.

La evidencia de evaluación del producto está en [evals.md](evals.md).

## 3. Funcionamiento: de la solicitud al envío

El diagrama de referencia está en [arquitectura.md](arquitectura.md). En lenguaje llano, una solicitud recorre estas etapas:

1. **Ingreso (intake).** La persona joven conversa con el asistente de `apps/web` (turnos de chat asíncronos que procesa un worker con cola durable en Postgres). También puede subir CV o describir su experiencia. El LLM extrae un borrador de perfil; si no hay clave de OpenRouter se usa un extractor heurístico determinista ([ADR-0006](../.agents/adr/0006-guided-chat-intake.md)).
2. **Perfil y evidencia.** Se normaliza el perfil (`CandidateProfile`, contratos JSON Schema con Ajv en `packages/domain`). Las credenciales declaradas se verifican por capas: Certo, luego Accredible, luego Credly, y si ninguno está disponible, un mock explícito que nunca se presenta como verificación externa. Estados: `verified`, `declared`, `unverified`, `rejected` ([ADR-0003](../.agents/adr/0003-verification-and-human-approval.md)).
3. **Matching con HiGHS.** Las vacantes (de empresa, extraídas de texto, PDF o imagen, y del catálogo) se contrastan con el perfil. Las restricciones duras y la asignación se calculan de forma determinista con el solver HiGHS (`packages/solver`); el tiempo de traslado usa Google Maps cuando hay clave y, si no, una matriz local y un catálogo geográfico offline de Panamá. Resultado: apta, apta con brechas o no apta por ahora, con explicación.
4. **Auditoría de sesgo y ruta.** Un auditor contrafactual revisa requisitos discriminatorios. El agente de formación convierte las brechas en una hoja de ruta con cursos del catálogo ([ADR-0005](../.agents/adr/0005-exploration-advisory-training-roadmap.md)). El orden del workflow Mastra (`apps/agent-runtime/src/workflow/graph.ts`) es: Exploration, Profile and Evidence, Market and Matching, Bias Auditor, Training.
5. **Borrador de postulación.** Se genera un borrador adaptado. El servicio lo guarda como `open` (los estados reales del código son `open`, `rejected` y `submitted`; `draft`, `pending_human_approval`, `approved` y `rejected` son el vocabulario de [ADR-0003](../.agents/adr/0003-verification-and-human-approval.md), no valores del código).
6. **Aprobaciones.** Requiere la aprobación registrada de la persona candidata; con hallazgos críticos (brecha crítica, credencial sin verificar, alerta de sesgo o traslado inviable), también la del orientador. La interfaz deriva etiquetas como "Borrador", "En revisión del orientador" y "Lista para enviar" a partir de esas aprobaciones.
7. **Envío.** Solo un borrador `open` con las aprobaciones exigidas puede enviarse mediante la herramienta autorizada. Los reintentos usan claves de idempotencia (tabla `submission_idempotency`) para no duplicar envíos. La empresa decide por su cuenta si avanza a entrevista; ningún agente envía mensajes, avanza entrevistas ni envía postulaciones.

Cada paso queda en el registro de auditoría con `trace_id`. Las notificaciones se anotan en un outbox SQL (solo roles e ids, sin correos ni teléfonos).

## 4. Despliegue

### 4.1 Requisitos

- Node.js >= 22 y npm (workspaces).
- Docker (opcional, para el runtime en contenedor).
- PostgreSQL / Neon (recomendado; sin base de datos hay modo memoria).

### 4.2 Ejecución local

```bash
npm ci
cp .env.example .env                      # runtime y semillas
cp apps/agent-runtime/.env.example apps/agent-runtime/.env   # opcional: Certo, Maps
cp apps/web/.env.example apps/web/.env.local                 # Next.js no lee el .env raíz
# completar los valores en esos archivos locales (no se versionan)

npm start            # runtime de postulaciones, puerto 3000 (usa .env)
npm run dev          # apps/web en http://localhost:3001 (vía neon-env)
npm run start:worker # worker de turnos de chat (requiere DATABASE_URL)
```

Notas verificadas:

- `npm run dev` ejecuta `neon-env run -- next dev --port 3001` desde `apps/web`; requiere la CLI/paquete de Neon configurado (`neon.ts` en la raíz, dependencias `@neon/config` y `@neon/env`).
- `apps/web/.env.example` apunta `AGENT_RUNTIME_URL` a `http://localhost:3000` y `BETTER_AUTH_URL` a `http://localhost:3001`.
- Con `WORKBRIDGE_PERSISTENCE=memory` el chat y la cola funcionan en memoria (es lo que usan las pruebas Playwright); en cualquier otro caso usan Neon.
- Certo local: `npm run certo:up` / `npm run certo:down` (`scripts/certo.mjs`). Requiere clonar antes el repositorio de Certo en `apps/certo` (el script imprime el comando exacto y el commit fijado) y usa el overlay `deploy/certo/compose.local.yml`. Certo es AGPL-3.0 y se despliega aparte del monorepo.

Validación local: `npm run verify`, `npm run gate:ci`, `npm run test:e2e` (ver estado en 2.6).

### 4.3 Docker

`Dockerfile` multietapa sobre `node:22-alpine`: una base común (`npm ci`) y dos destinos. El destino `runtime` (el último, el que construye `docker build .`) expone el puerto 3000, arranca `npx tsx apps/agent-runtime/src/application/main.ts` y tiene healthcheck sobre `GET /health`. El destino `web` ejecuta `next build` y arranca `next start` en el puerto 3001. El worker de chat reutiliza la imagen `runtime` con otro comando. `compose.yaml` levanta runtime, worker y web (más Certo, que exige clonar antes `apps/certo`) con `npm run local:up` / `npm run local:down`; no se ejecutó en esta entrega.

```bash
docker build -t workbridge-application .          # destino runtime (el último)
docker run --rm --env-file .env -p 3000:3000 workbridge-application
docker build --target web -t workbridge-web .       # opcional: la web
```

Sin `DATABASE_URL` ni `NEON_DATABASE_URL`, `GET /health` informa `databaseMode: "memory"` y la persistencia es temporal. Las credenciales se inyectan por entorno del proveedor, nunca dentro de la imagen.

### 4.4 Vercel

`vercel.json` enruta todas las solicitudes a `apps/agent-runtime/src/application/vercel.ts` (función `@vercel/node`). Pasos: importar el repositorio, definir las variables de entorno (mínimo `DATABASE_URL` y `BETTER_AUTH_SECRET`), desplegar y comprobar `GET /health`. Si `DATABASE_URL` está vacío y existe `NEON_DATABASE_URL`, el runtime usa Neon como respaldo y `/health` informa `databaseMode: "neon-backup"`, `persistence: "sql"`. `apps/web` es una aplicación Next.js (`npm run build` ejecuta `next build` en el workspace) y se despliega como proyecto aparte con su propia configuración de entorno.

### 4.5 Base de datos

Migraciones SQL numeradas en `migrations/`:

| Archivo | Contenido |
|---|---|
| `001_initial.sql` | `candidate_profiles`, `candidate_preferences`, `candidate_saved_searches`, `candidate_vacancy_visits` |
| `002_better_auth.sql` | `user`, `session`, `account`, `verification` y `employer_organizations` |
| `003_chat_sessions.sql` | `candidate_chat_sessions` |
| `004_chat_jobs.sql` | `chat_jobs` y `chat_queue_metrics` (cola durable del chat) |

`npm run db:migrate` aplica las cuatro con la CLI de Neon (`neon psql production -- -f ...`); requiere la CLI `neon` autenticada y un proyecto/rama llamado `production`. Alternativa con cualquier Postgres: `psql "$DATABASE_URL" -f migrations/001_initial.sql -f migrations/002_better_auth.sql -f migrations/003_chat_sessions.sql -f migrations/004_chat_jobs.sql`. Las tablas `submission_idempotency` y `notification_outbox` se crean solas (`CREATE TABLE IF NOT EXISTS`) desde el runtime al usarse con SQL.

### 4.6 Variables de entorno (solo nombres)

La mayoría figura en `.env.example`, `apps/agent-runtime/.env.example` y `apps/web/.env.example`; `BETTER_AUTH_SESSION_SECRET`, `CHAT_METRICS_TOKEN` y `WORKBRIDGE_PERSISTENCE` no están en ninguna plantilla y se leen directamente del código. Nunca se versionan valores reales.

| Variable | Propósito | De dónde sale | Si falta |
|---|---|---|---|
| `DATABASE_URL` | Postgres primario | Panel de Neon u otro Postgres | Modo memoria (runtime); el chat web y la autenticación requieren base |
| `NEON_DATABASE_URL` | Respaldo SQL del runtime | Neon | Solo se usa si falta `DATABASE_URL` |
| `BETTER_AUTH_SECRET` | Firma de sesión y roles | Se genera localmente (cadena aleatoria larga); mismo valor en runtime y web | Obligatoria para sesiones por rol |
| `BETTER_AUTH_URL` | Origen público para callbacks | URL del despliegue (`http://localhost:3001` en local) | Callbacks incorrectos |
| `BETTER_AUTH_SESSION_SECRET` | Secreto de sesión del BFF; si falta se usa `BETTER_AUTH_SECRET` | Opcional | Cae a `BETTER_AUTH_SECRET` |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | OAuth de Google | Google Cloud Console | Se desactiva Google; queda el resto de métodos |
| `AGENT_RUNTIME_URL` | URL del runtime para el BFF | Despliegue del runtime | Las rutas `/api/applications` no alcanzan el runtime |
| `OPENROUTER_API_KEY` | LLM del perfil y del chat | openrouter.ai | Extractor heurístico determinista |
| `OPENROUTER_MODEL`, `OPENROUTER_VISION_MODEL`, `OPENROUTER_BASE_URL` | Modelo de texto, de visión y base alternativa | Configuración | Valor por defecto; sin visión se exige `altText` en imágenes |
| `GOOGLE_MAPS_API_KEY` | Matriz de distancias y geocodificación | Google Cloud Console | Matriz local del solver y catálogo geográfico offline de Panamá |
| `CERTO_BASE_URL`, `CERTO_API_TOKEN` | Verificación de credenciales con Certo | Instancia de Certo (local o desplegada; fuera de localhost exige https) | Fallback a Accredible, Credly o mock transparente |
| `ACCREDIBLE_API_TOKEN`, `CREDLY_API_TOKEN` | Proveedores de respaldo (el `.env` raíz también lista `ACCREDIBLE_API_KEY`) | Cada proveedor | Se omite el proveedor |
| `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, `LANGFUSE_BASE_URL` | Ingesta de trazas | Proyecto de Langfuse | Sin las dos claves no hay llamada de red; un fallo de Langfuse no rompe la ejecución |
| `CHAT_METRICS_TOKEN` | Protege `/api/health/chat/metrics` | Se genera localmente | El endpoint responde 401 (ver sección 5) |
| `WORKBRIDGE_PERSISTENCE` | `memory` fuerza almacenes en memoria | Valor fijo | Usa Neon |
| `PORT` | Puerto del runtime (3000 por defecto) | Entorno | 3000 |
| `AUTH_SEED_ENV`, `SEED_COUNSELOR_EMAIL`, `SEED_EMPLOYER_EMAIL` | Parámetros de `seed:roles` | Entorno | Valores `example.test` de desarrollo |

Degradación elegante, en resumen: sin OpenRouter hay extractor heurístico; sin Google Maps hay matriz local; sin Certo hay cadena de proveedores y mock transparente; sin Langfuse no hay trazas externas pero sí auditoría interna; sin base de datos el runtime funciona en memoria (no persistente); el outbox de notificaciones solo escribe en SQL cuando hay base.

### 4.7 Datos semilla y usuarios de demo

- `npm run seed:roles` (`scripts/seed-roles.ts`): requiere `DATABASE_URL` y la migración 002. Crea en una transacción una organización de empresa y un usuario **orientador** y otro **empresa** (con correos de `@example.test`, configurables por las variables `SEED_*`). Es idempotente (`on conflict ... do update`).
- `npm run seed:demo` (`scripts/seed-demo.ts`, datos en `scripts/seed/demo-data.ts`): requiere `DATABASE_URL`; carga cuentas de estudiantes, orientadores y empresas de demostración, con sus sesiones de chat y búsquedas guardadas. La contraseña de demo está definida en `scripts/seed/demo-data.ts` (es solo para datos sintéticos; no se reproduce aquí).
- Guion de la demostración: [runbook-demo.md](runbook-demo.md).

## 5. Operación y observabilidad

- **Salud del runtime:** `GET /health` (puerto 3000) informa `databaseMode` (`memory`, `primary` o `neon-backup`) y `persistence`. Es la comprobación posterior al despliegue.
- **Salud de base en la web:** `GET /api/health/db` ejecuta una consulta a Neon; responde `ok` o `503` con la causa del error de conexión.
- **Salud del chat:** `GET /api/health/chat/metrics` (métricas y alertas de la cola). Exige `Authorization: Bearer <CHAT_METRICS_TOKEN>`; si la variable no está definida responde siempre 401.
- **Registro de auditoría:** el runtime guarda eventos por `traceId`; `GET /audit?traceId=...` (con sesión autorizada) los devuelve. Sirve para revisar quién hizo qué antes de aceptar un borrador.
- **Langfuse:** al terminar un workflow, si hay `LANGFUSE_PUBLIC_KEY` y `LANGFUSE_SECRET_KEY`, se envía un lote a `LANGFUSE_BASE_URL/api/public/ingestion` (por defecto `https://cloud.langfuse.com`). Es de mejor esfuerzo (#116). Cómo leer una traza: abrir el proyecto en Langfuse, buscar por `trace_id`; cada agente es un tramo con herramienta, modelo y costo.
- **Almacén DQL:** los pasos que fallan o quedan bloqueados se registran con un estado y un historial de transiciones válidas (`apps/agent-runtime/src/workflow/observability.ts`: `DqlState`, `DqlRecord`), de modo que un caso no se pierde en silencio y puede reintentarse.
- **Outbox de notificaciones:** tabla `notification_outbox`; filas con rol del destinatario, canal `in_app`, marca de tiempo y `trace_id`.
- **Cola del chat:** tablas `chat_jobs` y `chat_queue_metrics`; el worker (`npm run start:worker`) toma un trabajo a la vez con arrendamiento (lease) y confirma la sesión antes de marcar el trabajo como exitoso.

## 6. Seguridad

- **Manejo de secretos.** Los `.env.example` solo contienen nombres; los valores reales viven en el entorno del proveedor. El runtime rechaza claves, tokens o cadenas de conexión dentro de borradores o razones de auditoría (`apps/agent-runtime/src/application/secrets.ts`). Los guardarraíles filtran PII en entradas, salidas y resultados de herramientas.
- **Incidente de `apps/web/.env.local`.** El archivo quedó versionado en `main` pese a `.gitignore` y contenía credenciales reales en el historial (añadido en `1ae8200`; modificado en `7a3d268`, `b433e48` y `62343b1`). Remediación:
  - Hecho: PR #106 (fusionado) dejó de versionar el archivo y añadió `scripts/purge-leaked-env.sh`.
  - **Pendiente, a cargo de los dueños de las cuentas:** (1) **rotar todas las credenciales** que estuvieron expuestas (base de datos Neon, OpenRouter, Google Maps y cualquier otra presente); la rotación es lo urgente porque purgar el historial no invalida secretos ya copiados; (2) **purgar el historial** con `scripts/purge-leaked-env.sh` (por defecto es un ensayo sin cambios; `--apply` reescribe un clon espejo; `--apply --push` fuerza el push y debe ejecutarlo un propietario del repositorio, después de rotar). Hasta que ambas cosas se hagan, el historial público sigue conteniendo secretos que deben considerarse comprometidos.
- **Autenticación y roles.** Better Auth con Postgres (correo con enlace mágico, Google opcional, sesión anónima). Roles `candidate`, `counselor`, `employer`; orientador y empresa se asignan por semilla (`seed:roles`), no por registro libre. La empresa solo accede a datos de su organización ([ADR-0008](../.agents/adr/0008-role-organization-authorization.md)). El BFF firma la sesión que verifica el runtime; las sesiones de chat se ligan al usuario autenticado.
- **Humano en el circuito.** Candidato aprueba su borrador; el orientador interviene ante hallazgos críticos; la empresa decide el avance a entrevista. El envío exige las aprobaciones registradas (candidata y, si hay compuerta, orientador) y es idempotente.
- **Equidad.** Auditoría contrafactual de sesgo en vacantes y ranking explicable.

## 7. Limitaciones y trabajo futuro

Limitaciones conocidas:

- Compuertas de calidad: `gate:ci` pasa en local y en el workflow de GitHub Actions (`.github/workflows/ci.yml`) con typecheck y cobertura. Lint permanece fuera del gate por los errores legacy de `docs/old/design/previews/`; e2e requiere un entorno web/runtime levantado.
- Credenciales filtradas: rotación y purga de historial **pendientes** (sección 6).
- Certo no está integrado contra un despliegue real; la verificación recae en proveedores de respaldo o en el mock declarado ([ADR-0003](../.agents/adr/0003-verification-and-human-approval.md), "integración técnica pendiente").
- Notificaciones solo en bandeja interna (`in_app`); sin correo, SMS ni WhatsApp.
- `vercel.json` cubre solo el runtime de postulaciones. El `Dockerfile` (destinos `runtime` y `web`) y `compose.yaml` cubren runtime, worker y web, pero ninguna receta de despliegue se reprodujo de extremo a extremo en esta entrega.
- El runtime en modo memoria pierde datos al reiniciar; los puertos de Playwright y datos de vacantes son de demostración.
- Cobertura de evaluación acotada al conjunto de casos etiquetados ([evals.md](evals.md)).

Trabajo futuro: limpiar los errores legacy de lint y activar lint en CI (issue #24), completar la cobertura e2e browser-level (issue #23), completar rotación y purga, integrar Certo en producción, añadir canales de notificación reales, reproducir y validar `compose.yaml` y un despliegue único de web, runtime y worker, y ampliar el catálogo de vacantes y centros de formación.
