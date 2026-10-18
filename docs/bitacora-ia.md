# Bitácora de IA — WorkBridge (Reto 3)

Requisito oficial: *Qué partes se hicieron con IA, con qué herramienta y qué se modificó a mano.*

Esta bitácora se reconstruyó **a partir de la evidencia del repositorio** (commits, trailers `Co-authored-by`, trazas, artefactos de `.agents/skills/platform/`, PRs de GitHub `HackathonFISC/equipo-02`) más una sección de hechos atestados por el mantenedor para la última sesión de trabajo. Cuando la evidencia no permite saber si algo fue hecho por una IA o a mano, se escribe **«no determinable con la evidencia del repositorio»**. No se estiman porcentajes: no hay datos para hacerlo de forma honesta.

Documentos hermanos: [arquitectura](arquitectura.md) · [metodología](metodologia.md) · [evals](evals.md) · [runbook de demo](runbook-demo.md) · [README](../README.md).

Corte de datos: historial de 277 commits (2026-10-09 a 2026-10-17), 58 PRs (57 fusionados) y 92 líneas de traza.

---

## 1. Resumen de uso de IA

- **Se usó IA de forma extensa y declarada**, con varias herramientas distintas (Cursor, Claude Code, Codebuff, y otras registradas solo en trazas; ver sección 2). La bitácora anterior del README decía que OpenCode (GPT-5.6 Luna) era la *única* herramienta; **eso no es consistente con el resto de la evidencia** (ver 1.1).
- **Principio de trabajo:** las personas del equipo deciden alcance, contratos, qué se fusiona y quién revisa; la IA propone, implementa tickets acotados y revisa. El flujo (`quirk Skills`: `grill-with-docs` → `to-spec` → `to-tickets` → `implement` → `review-pr` → `review-fix-loop` → `ship-subissue`) obliga a puertas de revisión y aprobación humana (ADR-0003, ver sección 4).
- **Autoría humana en git:** los 277 commits están firmados por tres identidades humanas (Querube Ariza / @KerubeDev, 96 commits; Mateo Del Giudice / @MateoDG2006, 92; Jhuomar Boskoll Quintero / @quantumquirkxyz, 89). No hay cuentas de automatización como autoras. Que un commit lleve nombre humano **no** implica que se escribió a mano: la IA trabajó bajo esas identidades.
- **Trailers de IA:** 58 de 277 commits (21 %) llevan un trailer `Co-authored-by` de una herramienta de IA. La ausencia de trailer no prueba trabajo manual (ver sección 7).

### 1.1 Discrepancias con la bitácora anterior (README, «Bitácora de IA»)

| Afirmación anterior | Lo que muestra la evidencia | Corrección |
|---|---|---|
| «La única herramienta generativa usada … fue OpenCode (GPT-5.6 Luna)». | Trailers: Cursor en 49 commits, Claude en 9, Codebuff en 1. Trazas: Cursor, xAI (`grok-4.7`), OpenAI (`codex`, `gpt-6.1-sol`) y OpenCode (`deepseek-v4.1-flash-free`). | Hubo al menos cinco herramientas/proveedores. OpenCode aparece en **una** traza (un `review-pr`), con otro modelo. |
| «OpenCode (GPT-5.6 Luna)». | La cadena «Luna» / «GPT-5.6» solo aparece en el README y en `artifacts/implement/102.md` (autodeclaración). No aparece en ninguna traza, trailer ni PR. | No verificable de forma independiente. Se conserva como **autodeclaración** del ticket #102, no como hecho comprobado. |
| La tabla «Asistencia por área» cubre intake, matching, credenciales, web y docs con tareas de la IA limitadas a explorar y revisar. | Los commits de esas áreas (p. ej. #6 credenciales, #12 aplicación, #9 workflow) llevan trailers de Cursor y trazas `implement` de Cursor/xAI/OpenAI. La IA **implementó** código, no solo exploró. | La tabla de la sección 3 la reemplaza. |
| Frase suelta «; this scope statement is recorded in commit `45d8cac`» pegada al párrafo en español. | Texto residual de una edición automática o apresurada. | Se retira de la narrativa; el README debe enlazar a esta bitácora. |
| Ausencia total de Claude Code. | Trailers de Claude Sonnet/Opus/Haiku 5.5 en 9 commits y pie «Generated with Claude Code» en los PR #52, #74, #75, #79, #117. | Añadido en las secciones 2 y 5bis. |

---

## 2. Herramientas y modelos usados

### 2.1 Tabla maestra

Los nombres de modelo son **los que registró la propia traza o el trailer**; no se verificaron contra facturación ni logs de proveedor.

| Herramienta | Proveedor / modelo (según la fuente) | Evidencia | Para qué se usó |
|---|---|---|---|
| **Cursor** (agente) | No siempre indicado. Trailer genérico `Cursor <cursoragent@cursor.com>`; las trazas dicen `composer` (1) e `inherit` (3). | 49 commits con trailer (44 de «Mateo Del Giudice», 5 de «MateoDG2006», 2026-10-16 a 17); trazas `implement` #6 y `review-pr`/`review-fix-loop` del PR #21 | Implementación de tickets del plano de ejecución (credenciales #6, workflow #9, aplicación #12, bias auditor #111, naming #112, outbox #114, Langfuse #116), resolución de merges, artefactos `implement`/`review-fix`. |
| **Claude Code** (Anthropic) | `Claude Sonnet 5.5` (8 commits), `Claude Haiku 5.5` (3), `Claude Opus 5.5` (2), según trailers | Trailers en 9 commits (todos 2026-10-17): `21be2e3`, `39738f1`, `3714fe2`, `1ee06b0`, `10eafce`, `bbe61a6`, `1a46540`, `03c761b`, `71b574b`; pie «Generated with Claude Code» en PR #52, #74, #75, #79, #117; revisión «Review (Claude)» en PR #106 | Spec y tickets de la web, superficies de counselor y empleador, chat guiado, revisiones, resolución de conflictos, shortlist, seguridad del `.env`, docs. Detalle de la última sesión en la sección 5bis. |
| **xAI** (vía el agente que escribió la traza) | `grok-4.7` | 4 trazas `implement`: #12 (×2), #99, #94 | Implementación de aplicación (#12), renombrado/ADR-0009 (#99), bias auditor (#94). La herramienta anfitriona **no consta** en la traza. |
| **OpenAI** (ídem) | `codex` (1) y `gpt-6.1-sol` (1) | Trazas `implement` #95 (notificaciones) y #96 (Langfuse) | Notificaciones por outbox y ingesta Langfuse. `artifacts/implement/95.md` y `96.md` dicen que se **preservaron commits de Cursor**, o sea trabajo mixto. |
| **OpenCode** | `deepseek-v4.1-flash-free` (traza); `GPT-5.6 Luna` (solo README y `implement/102.md`) | 1 traza `review-pr` (PR #25, issue #10, 15 hallazgos); ticket #102 | Revisión del PR #25; exploración y revisión de trazabilidad para la bitácora anterior (#102, commit `6d48081`, autodeclarado). |
| **Codebuff** | No indicado | 1 commit con trailer: `56dbdb9` (autor Querube Ariza, 2026-10-16, «fix(taxonomy): verify ESCO concept URIs…», #53) | Verificación de URIs ESCO del seed de Panamá. |
| **Scripts de la plataforma `quirk`** | `anthropic / claude-sonnet-4-20250514` como **valor por defecto** en `.agents/skills/platform/record-execution.mjs:240` | 81 de 92 trazas | **No es evidencia de una llamada a modelo** (ver 2.3). |

### 2.2 Conteos derivados de las trazas (`.agents/skills/platform/traces/*.jsonl`)

92 líneas en total: 32 (2026-10-16) + 60 (2026-10-17).

| Proveedor / modelo | Trazas | Skills asociadas |
|---|---|---|
| anthropic / claude-sonnet-4-20250514 (por defecto del script) | 81 | `skill-audit` 59, `skill-dev/lockfile-maintenance` 10, `evaluate-skill` 8, `skill-dev/skill-audit` 2, `skill-dev/skill-testing-framework` 2 |
| xai / grok-4.7 | 4 | `implement` 4 |
| cursor / inherit | 3 | `review-pr` 2, `review-fix-loop` 1 |
| cursor / composer | 1 | `implement` 1 |
| opencode / deepseek-v4.1-flash-free | 1 | `review-pr` 1 |
| openai / codex | 1 | `implement` 1 |
| openai / gpt-6.1-sol | 1 | `implement` 1 |

Por skill de entrega: `implement` 7, `review-pr` 3, `review-fix-loop` 1. En total son **11 trazas de trabajo real** (con contexto de issue o PR) y 81 de la propia plataforma.

### 2.3 Cómo leer esas trazas (limitaciones de los datos)

- Las 81 trazas con `claude-sonnet-4-20250514` tienen `durationMs` 0 o de milisegundos, `contextRefs` vacío o de tipo sonda (`task-allowlist-probe`, `task-lockfile-integrity`…) y `artifactType: unknown`. Cuadran con ejecuciones de la suite de validación de skills, y el modelo es el valor por defecto de `record-execution.mjs`. **Conclusión: no demuestran que Anthropic Sonnet 4 se usara en el desarrollo.**
- El campo `model` lo rellena el agente que escribe la traza; Cursor puede alojar varios modelos (`inherit` no dice cuál). Para #12 la traza dice `grok-4.7`, pero los commits de #12 llevan trailer de Cursor: **no determinable** qué modelo concreto escribió cada commit.
- Hay trazas de `review-pr` y `review-fix-loop` solo para los PR #21 y #25; el resto de las revisiones está en comentarios de PR (sección 4), no en trazas.

---

## 3. Qué se hizo con IA, por área

Leyenda de evidencia: hashes de commit; `impl/N` = `.agents/skills/platform/artifacts/implement/N.{md,json}`; `fix/N` = `…/implement-review-fixes/N`; `loop/N` = `…/review-fix-loop/N`; `merge/N` = `…/resolving-merge-conflicts/N`; PR # = GitHub.

| Área | AI-asistido | Hecho a mano | Evidencia | Cómo se verificó |
|---|---|---|---|---|
| **Intake** (audio, imagen, PDF, perfil) | Implementación y cobertura de tests de intake (`impl/1`, `impl/4`); PR #28 «cover candidate audio and image submissions»; `41a92b2` (fusión de fuentes en un perfil, trailer Cursor). | Campos de perfil, contratos y el límite entre extracción heurística y OpenRouter: **declarado** en README y ADR-0006; autoría concreta **no determinable**. | `ef1ff1f`, `41a92b2`, PR #15, #28, #55, #77; `impl/4`, `impl/1` | Tests del paquete; `loop/4`. El PR #28 quedó **bloqueado** en `review-fix-loop-28.md` (el issue #1 seguía parcial, `impl/1` dice `acceptanceCriteriaMet: false`). |
| **Matching / solver** (geografía, MILP, hoja de ruta) | Trabajo de solver y ruta de formación bajo el flujo `implement`; tickets del plano de ejecución (`impl/56`: siete subissues). Trailers de IA en esos commits: **ninguno** de los de `quantumquirkxyz` (ver sección 7). | Elección de dimensiones, pesos, restricciones duras y fixtures: declarado, no demostrable. | `73e232a`, `cf35082`, PR #18, #22, #26, #30, #65, #84, #85; `impl/2`, `impl/56` | `gate:ci`, suites de solver y training; validación de mercado en PR #29. |
| **Verificación de credenciales** (Certo → Accredible → Credly → mock) | Implementación completa de #6 con Cursor: `853dbdd`, `471cde4`, `1e120f0`, `421d3ab` (matriz de confusión), `98c1298`, `f43d5aa`, `a08829c`, `735a671`; resolución de conflictos de PR #16. | Definición de evidencia declarada, binding del holder y estados: declarado en README/ADR-0003. | PR #14/#16; `impl/6` (traza Cursor `composer`, puntuación 86); `merge/16`, `merge/16-pass-2`, `merge/16-pass-3`; `8eea3e0` | `loop` del PR #16 limpio (`ebc70e8`), revisión de PR con hallazgos corregidos (`98c1298`). |
| **Web / UI** | Spec y tickets de rediseño (`bbe61a6`, PR #52, Claude Opus + Sonnet); chat guiado (`71b574b`, PR #75, Claude Sonnet + Haiku); counselor (`03c761b`, PR #74); empleador (`1a46540`, PR #79); chat asíncrono (`3714fe2`, PR #115); shortlist (`39738f1`, PR #117); neo-brutal en la última sesión (sección 5bis). | Tokens/estilo Tailwind + shadcn (ADR-0007): decisión declarada. El resto de PRs de web (#54, #64, #67, #70, #73, #80–83, #86, #89): trailer de IA **ausente**, autoría **no determinable**. | PR #52, #74, #75, #79, #115, #117 (pie «Generated with Claude Code» en 52, 74, 75, 79, 117) | Tests de componentes (jsdom) y Playwright (PR #69); `npm run test:e2e:web` en PR #115. **La app web no se ejecutó de extremo a extremo con base de datos en la última sesión** (sección 5bis). |
| **Agentes / workflow** (4 agentes, Mastra, guardrails, observabilidad) | #9: `4cb417c`, `9d86fdc`, `7fc1566`, `cd9ab57`, `745099a` (todos con trailer Cursor); #12: `4cdaf1e`, `8716894`, `b68b9cd`, `02e5f32`; bias auditor #111 (`0d44be4`, `impl/94` traza xAI); Langfuse #116 (`1ee06b0`, `impl/96` traza OpenAI + trailers Cursor y Claude). | Arquitectura de cuatro agentes y límites del sistema: ADR-0002 (autoría concreta no determinable). | PR #19, #21 (20 reseñas), #111, #116; `impl/9`, `impl/12`, `loop/12`, `loop/9` | `loop/12`, `loop/9` limpios; trazas `review-pr` (hallazgos 3 → 0). Cobertura de #116: 92,24 % de líneas (reportado en el PR, ver sección 5). |
| **Documentación** | Archivo de la documentación previa bajo `docs/old` (`21be2e3`, Claude Sonnet); ADR-0009 y naming (`fb52241`, `impl/99`); bitácora anterior (#102, OpenCode autodeclarado); arquitectura y metodología (PR #108, #110); estos documentos (sección 5bis). | Redacción y mantenimiento del README: declarado por el equipo; no hay forma de separar texto humano y asistido. | PR #87, #108, #109, #110, #112; `impl/62`, `impl/99`, `impl/101`, `impl/102` | Revisión humana de PR; chequeos `git diff --check`. Documentación vieja con referencias obsoletas (sección 5). |
| **Tests** | Tests de regresión y de dominio dentro de cada ticket `implement` (todos los hashes con trailer de IA de arriba); `await` faltante en `service.test.ts` corregido en #117; cobertura Langfuse (`langfuse-ingestion.test.ts`). | Criterios de aceptación y fixtures deterministas: declarados; no demostrable quién escribió cada caso. | Artefactos `impl/*.json` con campo `validation.commands`; `docs/old` ya no es la fuente: ver [evals](evals.md) | `npm test`, `npm run gate:ci`, `eslint`, `tsc --noEmit` (comandos listados en cada artefacto). Cuenta con **fallos conocidos** (sección 5). |
| **DevOps / seguridad** | Untrack de `apps/web/.env.local` y script de purga (`10eafce`, PR #106, trailer Claude Sonnet); revisión «Review (Claude)» que fijó `git-filter-repo` a la etiqueta `v2.47.0` con SHA-256 (`f5dce46`); plan y revisión de fixes del PR #106 por `quantumquirkxyz`. | Rotar credenciales, purgar historia, Secret Scanning y gitleaks: el PR los marca como **pendientes y a cargo de las personas**; el estado real no consta en el repo. | PR #106, `scripts/purge-leaked-env.sh`, `10eafce`, `f5dce46` | Tres rondas de revisión en el PR #106; verificación local descrita en el PR (hash coincide, archivo alterado rechazado, `bash -n`). |

---

## 4. Cómo se controló la calidad del trabajo con IA

| Mecanismo | Qué es | Evidencia |
|---|---|---|
| **`review-pr` con dos ejes** | Revisión sobre `git diff origin/main...HEAD` con **Standards** (calidad de código) y **Spec** (cumplimiento del issue) por separado, cada hallazgo con severidad. | Comentarios y reseñas en PR #21, #25, #106, #115, #116, #117; trazas `review-pr` (3). |
| **`review-fix-loop`** | Ciclo medir → planificar fixes (`Review Fix Plan`) → implementar (`Review Fix Implementation`) → revisar de nuevo hasta cero hallazgos o bloqueo. | `loop/*` (36 artefactos), `fix/*` (24), `review-fix-loop-28.md` (estado `blocked`), PR #115 (2 vueltas), PR #117 (2 pasadas). |
| **Aprobación humana** | ADR-0003: acciones sensibles requieren aprobación de rol; en el repo, `require role approval before idempotent submission` (`8716894`). Las fusiones las hacen personas (commits de merge con committer GitHub, 60 commits). | `.agents/adr/0003-verification-and-human-approval.md`, `8716894` |
| **Tests y puertas de CI** | `lint`, `typecheck`, `npm test`, `gate:ci`, E2E Playwright; cada artefacto `implement` lista comandos ejecutados y omitidos. | `impl/*.json` campo `validation`. |
| **`resolving-merge-conflicts`** | Resolución documentada de conflictos como artefacto (`merge/11`, `15`, `16`, `19`, `21`, `31`). | `.agents/skills/platform/artifacts/resolving-merge-conflicts/` |
| **`ship-subissue`** | Último paso: solo se cierra tras revisión limpia y evidencia. Ruta de `nextConsumer` en las trazas (`review-pr` → `ship-subissue`). | Trazas de #21 / #12 |
| **Puntuación de calidad** | Algunas trazas guardan `artifactScore` (86 en #6, 90 en #99; el resto `null`, o sea desconocido). | Trazas `implement` #6 y #99 |

Hecho relevante: las reseñas de PR figuran con cuentas humanas (`MateoDG2006`, `quantumquirkxyz`). Que cada reseña fuera escrita por una IA o una persona **no es determinable con el repo** salvo las que lo declaran («Review (Claude)» en #106; «independent reviewer» en #117, que el mantenedor atestigua como agentes Claude separados).

---

## 5. Incidentes y lecciones

| Incidente | Qué pasó (evidencia) | Lección / acción |
|---|---|---|
| **Credenciales reales en el historial de git** | `apps/web/.env.local` quedó trackeado: la regla de `.gitignore` entró en `1d18718`, rama que no era ancestro del commit `1ae8200` («commit», Mateo Del Giudice, 2026-10-16, 340 archivos incluyendo informes de cobertura y archivos de `.next`), que hizo `git add`. Según el PR #106 contenía secretos reales (auth, Certo, OpenRouter, Google Maps y base de datos) introducidos por `b433e48` y `62343b1`. Ninguno de esos commits lleva trailer de IA: la autoría del archivo (humano o IA) es **no determinable**. Esta bitácora no lee ni cita su contenido. | PR #106 lo deja de trackear y añade `scripts/purge-leaked-env.sh` (dry-run, respaldo, falla cerrado). **No resuelve el incidente por sí solo:** quedan rotar credenciales, purgar la historia con force-push, limpiar `refs/pull/*`, pedir purga a GitHub Support y activar Secret Scanning. Los commits originales siguen presentes en este historial, y no hay evidencia en el repo de que la rotación o la purga se hayan hecho. Lección: no usar `git add` masivos, activar gitleaks. Quedan además 22 archivos de cobertura trackeados en `apps/agent-runtime/coverage`. |
| **Revisión del script de purga encontró un riesgo en la cadena de suministro** | El script descargaba `git-filter-repo` de la rama mutable `main` sin verificación; la revisión («Review (Claude)», PR #106) lo fijó a `v2.47.0` y a un SHA-256 (`f5dce46`). Antes, otra revisión marcó que `--push` forzaba aunque quedara contenido residual. | Las revisiones encadenadas (3 en #106) corrigieron fallos reales de un cambio hecho con IA. |
| **Un agente se negó a adoptar trabajo sin commitear de origen desconocido** | Atestado por el mantenedor (no verificable en git): en la última sesión, un agente Claude no quiso adoptar cambios no comprometidos (issue #100, shortlist del empleador) hasta que la persona lo autorizó; luego se adoptaron y pasaron por revisión independiente de dos pasadas (PR #117). | El humano decide qué trabajo ajeno entra al árbol; el agente no asume procedencia. |
| **Documentación obsoleta** | `CHANGELOG.md` y `AUTHORSHIP.md` describen el bundle `quirk Skills`, no WorkBridge (el CHANGELOG fecha 2.0.0 el 2026-10-03, antes del primer commit del repo, 2026-10-09). `impl/99` documenta que había referencias al nombre anterior «Puente Laboral Panamá» y al tracker `quantumquirkxyz/Agent-Hackathon` (corregidas por ADR-0009). El README tenía una bitácora que decía «única herramienta: OpenCode». La documentación anterior fue archivada en `docs/old` (`21be2e3`). | Esta bitácora y los documentos hermanos sustituyen a lo archivado. |
| **Tests que no estaban en verde** | Revisión del PR #117: 569 pasan y 1 falla (`chat-worker.test.ts`, falla igual en `origin/main` `3714fe2`); `tsc --noEmit` con errores ya existentes en main; `check-all.mjs` se cae en main (falta `policy/tool-risk-budget.json`). PR #116: la corrida con cobertura salió con código 1 porque el worker de `chat-screen` no arrancó; repetida solo esa suite pasó 12 tests (713 pasan, 10 omitidos, en total). `impl/56` dice que el `npm test` sin restricciones «no es una señal limpia». Issue #1 / PR #28: bloqueado y parcial. | Los fallos se reportaron en lugar de ocultarse; **no** se afirma suite completa en verde. |
| **Trazas que parecen uso de IA pero no lo son** | 81 de 92 trazas llevan un modelo por defecto del script (sección 2.3). | Aviso explícito para no sobreinterpretar el conteo. |
| **Bitácora previa sobredeclarada/incompleta** | Ver sección 1.1. | Corregida aquí. |

---

## 5bis. Sesión de refactorización visual y cierre (Claude Code)

Esta sección recoge **hechos atestados por el mantenedor** para la última sesión; el repositorio solo respalda parte de ellos (se indica).

**Herramienta:** Claude Code (Anthropic). Sesión principal con modelos de la familia Claude Sonnet/Haiku, más subagentes Claude en paralelo (Sonnet y Haiku). Las personas dieron las instrucciones, decidieron alcance y fusiones.

| Trabajo | Atestado | Respaldo en el repo |
|---|---|---|
| Dirección visual «neo-brutal / sticker wall» aplicada en `apps/web`: tokens de diseño, componentes de UI, bienvenida, chat, vacantes, ruta, perfil, postulaciones, orientador, empresa, acceso/cuenta y páginas 404/error. | Sí | Los commits de código visual no se pudieron identificar por asunto en el historial a la fecha de esta bitácora: **no determinable** a nivel de commit. Los estilos neo-brutal existen en `docs/old/design/previews/app.src.css`. |
| Galería estática de vistas previas de todas las pantallas (ahora en `docs/old/design/previews`). | Sí | Existe el directorio con 45 archivos, incluido `build.mjs`. |
| Revisión y fusión de **PR #106** (dejar de trackear el `.env.local` filtrado y script de purga), con descarga de `git-filter-repo` fijada y verificada añadida por Claude. | Sí | `10eafce` (trailer Claude Sonnet); comentario «Review (Claude)» en el PR; `f5dce46`. |
| **PR #115** (turnos de chat asíncronos) con resolución de conflictos. | Sí | `3714fe2` (trailer Claude Sonnet); comentario de resolución en el PR (único conflicto en `ChatScreen.tsx`, sin force-push). |
| **PR #116** (ingesta de Langfuse). | Sí | `1ee06b0` (trailers Cursor y Claude Sonnet); reseña Standards/Spec. |
| **PR #117** (shortlist ranqueada del empleador, issue #100), adoptando trabajo previo sin commitear tras autorización humana, con ciclo de revisión independiente de 2 pasadas. | Sí | `39738f1` (trailer Claude Sonnet); reseñas «pass 1» y «pass 2» y el comentario «Review Fix Implementation» (commit `a142b03`) en el PR. Pasada 1: 2 hallazgos (1 Standards, 1 Spec). Pasada 2: sin pendientes. |
| Archivo de la documentación previa en `docs/old` y escritura de este conjunto de documentos. | Sí | `21be2e3` (trailer Claude Sonnet). |

**Control en esa sesión:** cada informe de subagente fue contrastado por el lead con el repositorio y GitHub.

**Límites conocidos de esa sesión:**
- La app web **no se ejecutó de extremo a extremo** (no había base de datos).
- Las revisiones las hicieron **agentes Claude separados, no personas**.
- Las personas instruyeron, decidieron alcance y fusionaron.

---

## 6. Qué se modificó a mano (solo lo que la evidencia respalda)

La evidencia de trabajo manual es **escasa por construcción**: git no distingue una línea escrita por una persona de una escrita por una IA bajo la misma cuenta. Lo que sí se puede sostener:

| Qué | Evidencia |
|---|---|
| **Decisiones de alcance, de producto y de fusión** por parte de las personas. | Autoría humana de todos los commits de merge (39 merges, 60 commits con committer GitHub); comentario de aclaración de alcance en el issue #100 («12:23 scope clarification», citado en la reseña del PR #117); aprobación humana previa a adoptar el trabajo sin commitear (atestado). |
| **Resolución manual de conflictos en el PR #115**, indicada en su comentario y limitada a `ChatScreen.tsx`. | Comentario del PR #115. Hecha en la sesión Claude Code del mantenedor, o sea asistida; no es «a mano» en sentido estricto. |
| **Texto de los PRs y las decisiones registradas en ADR** (`.agents/adr/0001`–`0009`). | ADRs en el repo; su redacción concreta (humana o asistida) es **no determinable**. |
| **Instalación y adopción del bundle `quirk Skills`.** | ADR-0001; `AUTHORSHIP.md` declara la autoría del bundle en Jhuomar Boskoll Quintero. Si fue escrito con IA: **no determinable**. |
| **Commits sin trailer de IA** (219 de 277). | Pueden ser manuales o asistidos sin trailer; **no se cuentan como «hechos a mano»**. |

---

## 7. Limitaciones de esta bitácora

1. **Sin trailer no significa sin IA.** Solo 58 commits llevan trailer; las herramientas lo añaden de forma desigual (Claude solo aparece el 2026-10-17 en 9 commits, aunque el PR #52 dice que se usó antes; Cursor en 49). El trabajo de `quantumquirkxyz` (89 commits: solver, training, web) no muestra trailers: **no determinable** si usó IA, y con cuál.
2. **No hay logs de proveedor ni facturas.** Los nombres de modelo (`grok-4.7`, `gpt-6.1-sol`, `deepseek-v4.1-flash-free`, `Claude … 5.5`) son los escritos por las herramientas en trazas y trailers; no se pudieron verificar de forma independiente.
3. **Trazas parciales:** solo 11 trazas de trabajo real frente a 58 PRs y 277 commits. La mayoría del trabajo no tiene traza.
4. **Fallo de atribución dentro de un mismo ticket:** los commits de #12, #95 y #96 mezclan trailers de Cursor con trazas de xAI u OpenAI; no se puede asignar cada cambio a un modelo.
5. **Cuentas humanas ≠ autoría humana.** Las reseñas y comentarios de PR aparecen bajo cuentas de personas aunque fueran generados por agentes; solo unas pocas lo declaran.
6. **Sesión final:** lo de la sección 5bis es atestación del mantenedor; el repo respalda los PR y commits listados, no cada detalle (por ejemplo, la secuencia de subagentes).
7. **Rotación de credenciales y purga de historial:** la evidencia del repo solo muestra el stop-gap (PR #106). Estado final **no determinable**.
8. **Sin porcentajes.** No se estima qué fracción del código fue escrita por IA: el repositorio no contiene la información para hacerlo.
9. **Instantánea:** la bitácora refleja el repositorio hasta el commit `21be2e3` y los PR hasta el #117, más cambios sin commitear de las ramas de cierre.
