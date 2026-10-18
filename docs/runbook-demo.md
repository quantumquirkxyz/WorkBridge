# Runbook de la demo — WorkBridge (Reto 3 · Empleabilidad)

Guion para el video demo (máximo 3 minutos) y para la demostración en vivo (20 % de la nota). Está pensado para seguirlo con un cronómetro. Complementa [`../README.md`](../README.md), [`arquitectura.md`](arquitectura.md), [`metodologia.md`](metodologia.md), [`evals.md`](evals.md) y [`bitacora-ia.md`](bitacora-ia.md). Pertenece al issue #104 (congelamiento de la entrega).

> Requisito oficial: "Video demo: Máximo 3 minutos, mostrando el sistema funcionando de punta a punta". La demo en vivo se evalúa como "Funcionamiento en vivo: demostración en vivo del sistema funcionando de punta a punta".

> **Estado del runbook.** Este guion se escribió contrastando rutas, etiquetas y campos con el código y los tests, sin ejecutar la aplicación completa (no había base de datos). La sección 6 lista qué se verificó leyendo código y qué debe confirmar el equipo con **un ensayo en vivo con cronómetro** antes de congelar. Hay tres riesgos que pueden romper la demo y están marcados como **RIESGO** en las secciones 2, 3 y 6.

---

## 1. Objetivo y regla de oro

**Objetivo:** que el jurado vea, en menos de 3 minutos, a una persona joven pasar de "ayudo en la tienda de mi familia" a una postulación enviada, con personas revisando las decisiones importantes.

**Regla de oro del jurado:** un sistema de agentes que **perciben, deciden y actúan**, no una interfaz de chat. En cada segmento hay que señalar con la voz algo de esta lista:

| Qué mostrar | Dónde se ve en la demo |
|---|---|
| Agentes que perciben | El chat extrae experiencia informal y CV a habilidades con evidencia (agente de perfil/intake). |
| El solver determinista decide | Barras de "Preparación", "Te falta", "Casi listas para ti" y bloqueos por traslado, transporte y salario. El LLM nunca decide el puntaje ni la justicia. |
| Herramientas que actúan | Se arma el borrador (CV, carta, evidencia), se envía la postulación y se registra una notificación. No es solo texto: cambia el estado del sistema. |
| Humano en el bucle | La persona aprueba su borrador, orientación revisa las alertas, la empresa decide la entrevista. Nada se envía sin permiso. |
| Trazas y auditoría | Historial del borrador, registro de auditoría y Langfuse; auditor de sesgo contrafactual. |

Frase ancla para la apertura y el cierre: *"Los agentes proponen, el solver calcula, las personas deciden."*

**Mapeo a la rúbrica.** La rúbrica oficial no está en el repositorio. En la tabla del guion se indica, por segmento, qué parte de la regla de oro se gana (agentes que perciben, decisión determinista, herramientas que actúan, humano en el bucle, trazabilidad). El equipo debe sustituir esas etiquetas por los nombres exactos de los criterios de la rúbrica antes de grabar.

---

## 2. Preparación previa (checklist antes de grabar)

Marca cada casilla. Haz todo esto al menos 30 minutos antes.

### 2.1 Entorno

- [ ] Node.js 22 o superior (`engines.node` del `package.json`), dependencias instaladas con `npm install` en la raíz del repositorio.
- [ ] Rama/commit que se va a congelar (ver sección 5), árbol limpio. Nunca commitear `.env`, `.env.local` ni `node_modules`.
- [ ] Dos archivos de entorno creados a partir de las plantillas (solo nombres de variables; los valores los tiene el equipo, nunca en git ni en pantalla):

| Archivo | Plantilla | Variables relevantes para la demo |
|---|---|---|
| `.env` (raíz, lo lee `npm start` y `npm run seed:demo`) | `.env.example` | `PORT`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `DATABASE_URL` (o `NEON_DATABASE_URL`), `AUTH_SEED_ENV`, `SEED_COUNSELOR_EMAIL`, `SEED_EMPLOYER_EMAIL`, `OPENROUTER_API_KEY` (opcional), `GOOGLE_MAPS_API_KEY` (opcional), `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, `LANGFUSE_BASE_URL` (opcionales) |
| `apps/web/.env.local` (Next no lee el `.env` de la raíz) | `apps/web/.env.example` | `AGENT_RUNTIME_URL`, `BETTER_AUTH_SECRET` (el mismo valor que en la raíz), `BETTER_AUTH_URL`, `DATABASE_URL`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `OPENROUTER_VISION_MODEL`, `OPENROUTER_BASE_URL`, `GOOGLE_MAPS_API_KEY` |

- [ ] `PORT` del runtime y `AGENT_RUNTIME_URL` del web apuntan al mismo puerto (la plantilla usa 3000). El web corre en 3001 (`BETTER_AUTH_URL=http://localhost:3001`).
- [ ] Un solo `BETTER_AUTH_SECRET` en ambos archivos; si difiere, el runtime rechaza la sesión firmada.

### 2.2 Base de datos (necesaria para /chat, cuentas y roles)

El chat actual es asíncrono: el web encola el turno y un worker aparte lo procesa. En modo `WORKBRIDGE_PERSISTENCE=memory` la cola vive en el proceso del web y el worker no la ve, así que **la demo de punta a punta necesita base de datos real** (Postgres/Neon).

```bash
# 1. Migraciones (script existente; usa la CLI de Neon y la rama "production")
npm run db:migrate
# Equivalente directo si no usan la CLI de Neon:
#   psql "$DATABASE_URL" -f migrations/001_initial.sql -f migrations/002_better_auth.sql -f migrations/003_chat_sessions.sql -f migrations/004_chat_jobs.sql

# 2. Cuentas de demo con contraseña compartida (estudiantes, empresas, orientadores)
npm run seed:demo

# 3. (Solo para el cierre de la lista corta, ver 3.3) cuentas de rol por entorno
npm run seed:roles
```

- `seed:demo` imprime en consola la contraseña compartida y la lista `rol / correo / flujo`. La contraseña está en la constante `DEMO_PASSWORD` de `scripts/seed/demo-data.ts`. **No se copia a este documento ni se muestra en el video** (grabar con el campo de contraseña oculto).
- `seed:roles` crea un orientador y una empresa con los correos `SEED_COUNSELOR_EMAIL` y `SEED_EMPLOYER_EMAIL` (por defecto `counselor+development@example.test` y `employer+development@example.test`) y la organización `employer_org_<entorno>`. **Esas cuentas no tienen contraseña**: entran con el enlace por correo o hay que darles una. Para la demo, usa las cuentas de `seed:demo`.
- Los borradores y decisiones de postulación **no están en Postgres**: el runtime los guarda en memoria. Reiniciar el runtime borra los borradores; hay que crearlos en vivo en la misma sesión del runtime que se grabará.

### 2.3 Servicios (cuatro terminales)

```bash
# Terminal 1 — runtime de agentes y postulaciones (puerto PORT, 3000 por defecto)
npm start

# Terminal 2 — worker del chat (obligatorio: sin él el chat se queda en "Tu respuesta está en cola…")
npm run start:worker

# Terminal 3 — web (puerto 3001)
npm run dev
```

- `npm run dev` ejecuta `neon-env run` (requiere la CLI de Neon configurada para inyectar `DATABASE_URL`). Si no la usan, pongan `DATABASE_URL` en `apps/web/.env.local`.
- Comprobaciones rápidas: `GET http://localhost:3000/health` del runtime debe responder OK; abrir `http://localhost:3001/` y ver el titular "Tu experiencia cuenta. Aunque sea informal."

### 2.4 Cuentas y roles de la demo

Todas salen de `npm run seed:demo` (ver `scripts/seed/demo-data.ts`). Patrón de correo: `nombre.apellido@seed.workbridge.test`. Inicio de sesión: `/ingresar`, escribir el correo, abrir "Prefiero usar mi contraseña", escribir la contraseña compartida y pulsar "Ingresar". El destino se decide por rol (`/cuenta/inicio`): candidato a `/vacantes` (o `/chat` si no tiene perfil), orientación a `/orientador`, empresa a `/empresa`.

| Papel en la demo | Cuenta (semilla) | Por qué |
|---|---|---|
| Intake en vivo | `luis.chen@...` (estudiante 02, flujo `j1_sin_cv`) | El chat ya tiene nombre y la respuesta "No tengo / prefiero contarte"; queda en "experiencias". |
| Cierre de preferencias | `maria.gonzalez@...` (estudiante 03, `j1_perfil_sin_preferencias`) | Perfil de caja listo; el chat queda en la zona y faltan 5 respuestas con chips. |
| Matching y postulación | `camila.ortega@...` (estudiante 05, `j2_atencion_ciudad`) | Presencial, ciudad, USD 600: debe ver vacantes (por ejemplo `lnk-1001`, `lnk-1004`). |
| Sin vacante y ruta | `ricardo.mendoza@...` (estudiante 11, `j3_salario_alto`) | Mínimo USD 2500: la exploración queda vacía por salario y, como acepta cursos, aparece la ruta. |
| Orientación | `irene.solis@...` (orientadora 01) | Entra a `/orientador`. |
| Empresa | `rosa.mendez@...` (Banco Delta, empleadora 01) | Entra a `/empresa`. |

- [ ] Tres ventanas o perfiles de navegador **ya con sesión iniciada** (candidato, orientadora, empresa) para no perder tiempo en pantallas de ingreso. Una cuarta pestaña con Langfuse (ver 3.5).
- [ ] Un invitado (sin cuenta) puede usar `/chat`, pero **no puede preparar una postulación**: `/postulaciones/nueva` exige cuenta de candidato. Por eso la postulación se hace con Camila.
- [ ] Un PDF de CV de prueba (menos de 10 MB; el chat acepta PDF o fotos) en el escritorio, por si se muestra "Adjuntar CV". El repositorio no incluye un CV de ejemplo (`vendor-counter.pdf` es una vacante, no un CV).

### 2.5 Sin `OPENROUTER_API_KEY` (modo determinista)

Dejar `OPENROUTER_API_KEY` vacía es un modo soportado: el chat usa su agenda de respaldo y el extractor heurístico (`createChatFnFromEnv` devuelve `undefined`; el intake usa el extractor heurístico). Qué cambia:

| Con clave | Sin clave |
|---|---|
| El chat entiende texto libre largo y responde preguntas ("¿qué hace alguien de soporte técnico?"). | El chat sigue la agenda de preguntas; la forma segura de avanzar es **pulsar los chips** de respuesta. Un texto libre largo puede no llenar varios campos a la vez. |
| La lectura de CV/fotos puede usar el modelo de visión. | El CV se lee con el extractor heurístico; las imágenes necesitan texto alternativo. |
| Ventaja para el video: se ve "agente que percibe". | Ventaja para el vivo: sin latencia ni fallos de red. Matching, ruta, borrador y gates **no dependen del LLM** (son deterministas). |

Sin `GOOGLE_MAPS_API_KEY`, la geocodificación y la matriz de rutas usan el catálogo y la matriz local de Panamá (matching totalmente fuera de línea). Sin claves de Langfuse no hay llamada de red y las ejecuciones no fallan.

### 2.6 Ensayo previo (obligatorio)

- [ ] Ejecutar **una vez** el guion completo con cronómetro. Criterio de aceptación del issue #104: cabe en 3:00. Anotar el tiempo real por segmento en la tabla de la sección 3.
- [ ] Antes de cada toma: limpiar borradores viejos (reiniciar el runtime) y volver a ejecutar `npm run seed:demo` si se modificó una cuenta semilla.
- [ ] Zoom del navegador al 110–125 %, modo claro, notificaciones del sistema desactivadas, pestañas ajenas cerradas, ningún `.env` abierto en el editor.

---

## 3. Guion minuto a minuto (≤ 3:00)

Presupuesto total: **2:52** de guion más 8 s de colchón. Ritmo: 150 palabras por minuto como máximo; si una línea no cabe, se recorta la línea, no el paso.

### 3.1 Tabla del guion

| Tiempo | Pantalla / ruta | Qué hace el presentador | Qué ve el público | Qué se dice | Gana |
|---|---|---|---|---|---|
| **0:00–0:10** (10 s) | `/` (ventana candidato) | Muestra el inicio y pulsa "Empezar". Con sesión de invitado va a `/cuenta` y luego "Seguir como invitado" lleva a `/chat`. Para ahorrar tiempo, empezar ya en `/chat` con la cuenta de Luis. | Titular "Tu experiencia cuenta. Aunque sea informal." y la nota "Nunca enviamos una postulación sin tu permiso." | "WorkBridge es un sistema de agentes para jóvenes en Panamá: perciben su experiencia, deciden con un solver determinista y actúan, siempre con una persona al final." | Propuesta y regla de oro |
| **0:10–0:50** (40 s) | `/chat` (Luis) y luego `/perfil` | 1) Escribe el mensaje de la fila de entradas (ver 3.2) y pulsa "Enviar". 2) Muestra los chips "Habilidades encontradas". 3) Opcional con CV: "Adjuntar CV" y selecciona el PDF. 4) Abre `/perfil` y señala "Lo que sabes hacer". | Respuesta de WorkBridge que confirma lo entendido, chips de habilidades (por ejemplo "Atención al cliente", "Punto de venta y caja", "Control de inventario") y, en Mi perfil, la lista "Lo que sabes hacer" con evidencia. | "Ayudar en la tienda de la familia cuenta. El agente de perfil convierte lo que cuenta en habilidades con evidencia, sin inventar títulos: solo lo que la persona declaró." | Agente que percibe; evidencia |
| **0:50–1:20** (30 s) | `/vacantes` (Camila) | Abre una tarjeta con "Ver detalles de …". Señala la barra y "Te falta:". En la hoja lateral muestra "Tu preparación", "Lo que ya tienes", "Lo que te falta". Baja a "Casi listas para ti" si existe. | Tarjetas con modalidad, ubicación, salario, barra "Preparación NN %" y "Te falta: …". Hoja con tres bloques. Sección "Casi listas para ti" con "Te bloquea: …". Línea de descartes agrupada por causa. | "Esto no lo decide un modelo de lenguaje: lo calcula un solver determinista con la zona, el traslado, el transporte, el horario y el salario. Cada vacante muestra qué le falta a la persona, y las casi listas dicen qué las bloquea." | Decisión determinista |
| **1:20–1:35** (15 s) | `/ruta` (Ricardo) | Cambia a la ventana de Ricardo (mínimo USD 2500) o abre `/ruta`. | "Aún no encontramos una vacante para ti" con "Lo que más te bloqueó" y, en `/ruta`, "Tu ruta" con pasos numerados: curso, proveedor, horas, costo y "Cubre:". | "Cuando no hay vacante viable, el sistema no se rinde: explica la causa y arma una ruta de capacitación que cierra las brechas." | Ruta de formación; solver |
| **1:35–2:00** (25 s) | `/vacantes` → `/postulaciones/nueva` → `/postulaciones/<id>` (Camila) | En la hoja de la vacante pulsa "Preparar mi postulación". Recorre las pestañas "CV", "Carta" y "Evidencia". Si aparece, señala el aviso "Necesita revisión de tu orientador/a". Pulsa "Aprobar mi postulación". | Pantalla "Preparando tu postulación", luego el borrador con CV, carta y evidencia (cada ítem con su etiqueta de verificación). Tras aprobar: "Tu orientador/a está revisando esta postulación." | "El agente de postulación arma el CV y la carta solo con evidencia declarada. Aquí la persona revisa y aprueba: nada sale sin su permiso." | Herramienta que actúa; humano 1 |
| **2:00–2:20** (20 s) | `/orientador` → `/orientador/<draftId>` (ventana orientadora) | Abre "Pendientes de revisión", entra a la fila, señala los "Motivos de revisión", escribe un motivo de 10 o más caracteres y pulsa "Aprobar". Vuelve a la ventana de Camila y recarga: "Lista para enviar. Tú decides cuándo." Pulsa "Enviar postulación" y "Sí, enviar". | Insignias de alerta (Brecha crítica, Credencial sin verificar, Alerta de sesgo o Transporte inviable), la evidencia y el historial. Mensaje "Aprobaste esta postulación." En el candidato, diálogo "¿Enviar tu postulación a …?" y "Enviamos tu postulación." | "Si el solver detecta una brecha crítica, una credencial sin verificar, una alerta de sesgo o un traslado inviable, un orientador humano decide antes del envío. El motivo es obligatorio y queda auditado." | Humano 2; auditoría |
| **2:20–2:42** (22 s) | `/empresa` → `/empresa/<submissionId>` (ventana empresa) | Abre "Postulaciones", entra a la tarjeta, señala "Documentos enviados" y "Evidencia aprobada por la persona", escribe un motivo y pulsa "Aprobar entrevista". Si se muestra la lista corta: pestaña con `/api/applications/vacancies/<vacancyId>/shortlist` (ver 3.3). | Documentos enviados, evidencia, y "La postulación pasó a entrevista." En la ventana de Camila: "Entrevista aprobada. La empresa te contactará." Opcional: JSON con `rank`, `score`, `gapSummary` (`biasAlerts` llega vacío; ver 3.3). | "La empresa decide la entrevista con un motivo registrado y ve solo la evidencia que la persona aprobó. También recibe una lista corta ordenada por el mismo puntaje determinista." | Humano 3; mercado de tres lados |
| **2:42–2:52** (10 s) | Pestaña Langfuse, o `Historial` del borrador | Muestra una traza y/o abre "Historial" del borrador. | Spans del flujo con `trace_id` o la línea de tiempo con actor y acción. | "Cada decisión deja traza y auditoría. Un auditor de sesgo contrafactual, que corre en el grafo de agentes y en la lista corta de la empresa, cambia nombre, género y corregimiento y bloquea la vacante si el resultado cambia. Los agentes proponen, el solver calcula, las personas deciden." | Trazabilidad y sesgo |
| **2:52–3:00** | — | Colchón. No se usa para agregar contenido. | — | — | — |

Tiempo real del ensayo (el equipo lo completa): intake ___ · matching ___ · ruta ___ · postulación ___ · orientación ___ · empresa ___ · cierre ___ · **total ___**.

### 3.2 Entradas de ejemplo (escribir exactamente)

Mensaje de intake (Luis, en `/chat`, campo "Escribe tu respuesta…", Enter para enviar):

> Ayudo en el minisúper de mi tía los fines de semana desde hace más de un año. Cobro en caja, atiendo a los clientes, acomodo la mercancía y llevo el inventario en un cuaderno.

Alternativa sin LLM (modo determinista), un chip por turno, sin escribir:

1. `experiences`: escribir "Caja en el minisúper de mi tía" (es texto libre; el único chip, "Todavía no", saltaría la experiencia).
2. `experience_tasks`: chip "Caja / cobrar".
3. `experience_duration`: chip "Más de un año".
4. `experiences_more`: chip "No, sigamos".
5. `education`: chip "Secundaria / bachiller".
6. `target_roles`: chip "Atención al cliente".
7. `zone`: chip "Panamá (ciudad)".
8. `modality`: chip "Presencial".
9. `schedule`: chip "Lunes a viernes, de día".
10. `minimum_salary_usd`: chip "USD 600".
11. `willing_to_train`: chip "¡Sí!".

Con los 11 pasos el chat redirige solo a `/vacantes`. **No caben en 40 s en una sola toma**: para el video, cortar en la edición o usar a María (le faltan solo los pasos 7 a 11) y Camila (ya completa). En el vivo, narrar los pasos mientras se pulsan los chips más rápidos y dejar los demás pre-contestados con las cuentas semilla.

Motivos de decisión (mínimo 10 caracteres para orientación; para la empresa basta un motivo no vacío):

- Orientadora: `Revisé la evidencia y el traslado es viable en bus.`
- Empresa: `Cumple el perfil y la experiencia en caja.`

### 3.3 Lista corta de la empresa (issue #100)

Mostrarla es **barato** (una pestaña con un JSON), pero tiene condiciones:

- Endpoint del navegador: `GET /api/applications/vacancies/<vacancyId>/shortlist` en el web (3001), con la sesión de empresa. En el runtime es `GET /vacancies/:vacancyId/shortlist` (ver `apps/agent-runtime/README.md`, sección "Employer shortlist (#100)"). Cada entrada trae `rank`, `submissionId`, `score`, `aptitude`, `gapSummary` y `biasAlerts`. Esta última casi siempre es `[]`: el auditor contrafactual bloquea la vacante ante cualquier alerta y, si está bloqueada, la lista completa sale vacía (`shortlistForVacancy`). No presentarla como evidencia del auditor.
- Los identificadores de vacante del catálogo semilla tienen la forma `lnk-1001` a `lnk-1006`.
- **RIESGO:** el runtime solo reconoce como dueña de esas vacantes a la organización `employer_org_<AUTH_SEED_ENV|NODE_ENV|development>` (la de `seed:roles`). Las empresas de `seed:demo` usan `seed_org_NN`, por lo que podrían recibir 403. Confirmar en el ensayo con qué cuenta de empresa responde 200; si ninguna, omitir la lista corta del video (no es requisito del guion) y mencionarla de palabra.
- Además, la lista corta solo incluye postulaciones **recibidas** y candidatos con perfil y preferencias en Postgres (no hay interfaz para esto; es un JSON).

### 3.4 Pistas para que el gate de orientación aparezca

El gate no aparece siempre: solo si el solver reporta una brecha crítica, una credencial sin verificar, una alerta de sesgo o un traslado inviable (`counselorGateReasons` en `apps/agent-runtime/src/application/gates.ts`). Sin gate, tras "Aprobar mi postulación" el estado pasa directo a "Lista para enviar" y **no hay nada que revisar en `/orientador`**. Con el catálogo semilla el motivo de sesgo no se puede provocar (ver 3.5); los otros motivos (brecha crítica, credencial sin verificar, traslado inviable) dependen del perfil y la vacante elegidos. En el ensayo, elegir y anotar la vacante para Camila cuya hoja muestre una brecha importante en "Lo que te falta", y usar siempre esa misma. Si ninguna activa el gate, ver Plan B (sección 4).

### 3.5 Cierre con trazabilidad

- **Langfuse:** con `LANGFUSE_PUBLIC_KEY` y `LANGFUSE_SECRET_KEY`, una ejecución completa del flujo de agentes envía un lote de ingesta a `LANGFUSE_BASE_URL` (por defecto `https://cloud.langfuse.com`). **RIESGO:** en el código revisado, el web y el servidor de postulaciones no exponen la ruta `POST /internal/workflow/runs`; el flujo de agentes con Langfuse se ejecuta desde código (`apps/agent-runtime/src/workflow`). Es probable que las acciones de la UI **no generen** trazas en Langfuse. Dejar abierta una pestaña con una traza ya generada por el equipo (ejecución previa del flujo) y decirlo con honestidad: "traza de una ejecución del flujo".
- **Auditoría visible en la UI:** el "Historial" del borrador (candidato) y del detalle de orientación/empresa muestra actor, acción y hora. En el runtime existe `GET /audit?traceId=…` (por el web: `/api/applications/audit?traceId=…`, requiere sesión). Si se muestra, probar antes con qué rol responde.
- **Auditor de sesgo:** no corre en el flujo de la interfaz. La alerta "Alerta de sesgo" del gate solo aparece si el documento de la vacante trae alertas de equidad, y las vacantes del catálogo semilla no las traen; en la demo no se verá. Se puede mencionar de palabra (es determinista: contrafactuales de nombre, género y corregimiento sobre el solver) y que corre en el grafo de agentes y en la lista corta, pero no mostrarlo como si fuera visible.
- **Agente de entrevista simulada:** existe como API (`POST /api/interview`), pero no tiene pantalla en el web. No incluirlo en el video; mencionarlo solo si sobra tiempo y sin mostrarlo.

---

## 4. Plan B / fallos en vivo

Regla: **nunca improvisar en cámara**. Decidir en 5 segundos y seguir; si algo falla, cortar a la alternativa.

| Falla | Señal | Qué hacer |
|---|---|---|
| El modelo (OpenRouter) tarda o falla | El chat muestra "Estoy pensando…" más de 5 s o "No pude continuar ahora…" con el botón "Reintentar" | Pulsar "Reintentar" una vez. Si persiste, vaciar `OPENROUTER_API_KEY`, reiniciar worker y web, y continuar con chips (modo determinista, sección 2.5). El resto del guion no cambia. |
| La base de datos o la red caen | "No pudimos cargar tus vacantes" con "Reintentar", `/chat` sin respuesta, `GET /api/health/db` con error | Cambiar a la ventana de respaldo con datos ya cargados: Camila con `/vacantes` abierta y la hoja de detalle ya abierta (la página conserva la última exploración en el navegador: "Te mostramos lo último que guardamos"). Reproducir el resto con el clip pregrabado del segmento. |
| El chat no avanza por falta del worker | "Tu respuesta está en cola…" indefinido | Comprobar que corre `npm run start:worker`. Si no se resuelve en 10 s, saltar al segmento de matching con Camila y decir que el intake está en el clip. |
| Sin vacante con gate para orientación | Tras aprobar, el estado es "Lista para enviar" | Aprobar y enviar de todos modos. Mostrar el gate con un clip pregrabado o con las capturas, y decir que el gate se activa con brecha crítica, credencial sin verificar, alerta de sesgo o traslado inviable. |
| La empresa no ve la postulación | `/empresa` muestra "No hay postulaciones pendientes" | Ver el riesgo de la sección 6 (el borrador de la UI puede no llevar organización de empresa). Usar el clip pregrabado del segmento de empresa y no inventar la decisión. |
| Langfuse sin traza | Pestaña vacía | Mostrar el "Historial" del borrador como registro de auditoría. |
| Falla el audio o el video del vivo | — | Reproducir el video final (≤ 3 min) subido y comentar encima. |

Material de respaldo que debe existir **antes** del evento:

- [ ] Un clip pregrabado por segmento (matching, ruta, borrador, orientación, empresa), cada uno con la duración de su fila de la tabla.
- [ ] El video completo ya subido (≤ 3 min) y descargado localmente.
- [ ] Capturas de página completa de cada pantalla clave.
- [ ] Una copia de la base de datos de demo ya sembrada y un respaldo de `.env`/`.env.local` fuera del repositorio.

---

## 5. Checklist de cierre del congelamiento (issue #104)

El congelamiento sigue a los bloqueantes #100, #103, #102 y #99. Hacerlo en este orden. **Los comandos de git los ejecuta el responsable del congelamiento; este documento solo los describe.**

- [ ] Los cuatro bloqueantes están integrados: lista corta de empresa (#100), documento de metodología (#103), bitácora de IA (#102), alineación de nombres (#99).
- [ ] `README.md` actualizado (problema, arquitectura de agentes, tecnologías, fuentes de datos, instalación, ejecución, credenciales de demo por variable y no por valor) y con el tag `final-24h` y el hash del commit congelado.
- [ ] Documentos enlazados desde el README: [`arquitectura.md`](arquitectura.md), [`metodologia.md`](metodologia.md), [`evals.md`](evals.md), [`bitacora-ia.md`](bitacora-ia.md) y este runbook.
- [ ] Verificación en verde en el commit a congelar:

```bash
npm run verify        # eslint + tsc --noEmit + vitest run
npm run gate:ci       # typecheck + cobertura (umbral de 80 % de líneas del runtime)
```

- [ ] Resultados de evals registrados en [`evals.md`](evals.md) con la fecha y el commit.
- [ ] Bitácora de IA completa y sin secretos.
- [ ] No hay secretos en el árbol de trabajo: `apps/web/.env.local` y `.env` están sin versionar (ver `scripts/purge-leaked-env.sh` y el issue #106 sobre el historial). Las credenciales que alguna vez estuvieron en el historial deben considerarse comprometidas y rotadas.
- [ ] Video grabado, **duración ≤ 3:00** (comprobar en el reproductor, no de memoria), subido y con el enlace anotado en el README.
- [ ] Ensayo completo cronometrado dentro de 3:00 (criterio de validación del issue).
- [ ] Crear y publicar el tag sobre el último commit válido (no ejecutar hasta confirmar el hash):

```bash
git switch main && git pull                 # o la rama de entrega acordada
git log -1 --format=%H                      # confirmar el commit a congelar
git tag -a final-24h -m "Congelamiento de la entrega: último commit válido"
git push origin final-24h
git tag -l final-24h                        # debe listar el tag
git rev-parse final-24h^{commit}            # debe coincidir con el hash anotado en el README
```

- [ ] Después del tag no se agregan commits a la rama de entrega. Si hay que corregir algo, se decide en equipo si se mueve el tag (nunca reescribir un tag ya publicado sin avisar).

---

## 6. Verificación del runbook

Este runbook **no se ejecutó de punta a punta**: en el entorno donde se escribió no había base de datos, ni runtime, ni worker, ni navegador con la aplicación. Lo que se hizo fue leer el código y los tests y contrastar cada ruta, etiqueta y campo. No se afirma que algún paso funcione en vivo.

### 6.1 Verificado leyendo código y tests

| Elemento | Fuente revisada |
|---|---|
| Comandos `npm` (`start`, `start:worker`, `dev`, `db:migrate`, `seed:roles`, `seed:demo`, `verify`, `gate:ci`) y `engines.node >= 22` | `package.json`, `apps/web/package.json` |
| Variables de entorno y sus plantillas | `.env.example`, `apps/web/.env.example` (solo nombres; no se leyó ningún `.env` real) |
| Cuentas semilla, correos, flujos y por qué sirven | `scripts/seed/demo-data.ts`, `scripts/seed-demo.ts`, `scripts/seed-roles.ts` |
| Inicio, "Empezar", `/cuenta`, `/chat`, redirecciones por rol | `components/WelcomeScreen.tsx`, `lib/account-access.ts`, `app/cuenta/**`, `app/ingresar/SignInForm.tsx` |
| Agenda del chat, chips y textos de las preguntas | `lib/chat/slots.ts`, `components/ChatScreen.tsx`, `e2e/async-chat.spec.ts` |
| Chat asíncrono con worker y cola | `lib/chat-turns-handler.ts`, `lib/chat-jobs.ts`, `scripts/chat-worker.ts` |
| Modo sin `OPENROUTER_API_KEY` | `lib/chat-worker.ts` (`createChatFnFromEnv`), `.env.example` del web, `playwright.config.ts` |
| Etiquetas de `/vacantes`, tarjeta, hoja, "Casi listas para ti", "Te falta", barra "Preparación" | `components/VacantesView.tsx`, `components/exploration/*` |
| `/ruta`: condiciones para mostrar la ruta (sin vacantes y con cursos aceptados) | `components/RutaView.tsx`, `components/exploration/NoMatchPanel.tsx`, `RoadmapList.tsx` |
| Borrador y aprobaciones del candidato (pestañas CV/Carta/Evidencia, botones, diálogos, mensajes) | `components/applications/*`, `app/postulaciones/**` |
| Motivos del gate de orientación | `apps/agent-runtime/src/application/gates.ts`, `lib/applications-status.ts`, `components/counselor/labels.ts` |
| Cola y revisión de orientación (títulos, motivo mínimo de 10 caracteres, botones) | `components/counselor/*`, `e2e/counselor-queue.spec.ts` |
| Cola y decisión de empresa (títulos, botones, mensajes) | `components/employer/*`, `e2e/employer-decision.spec.ts` |
| Lista corta (#100): rutas, campos de respuesta, propiedad por organización | `apps/agent-runtime/README.md`, `src/application/shortlist.ts`, `app/api/applications/[...path]/route.ts` |
| Auditor de sesgo y simulacro de entrevista como API sin pantalla | `apps/agent-runtime/src/bias`, `app/api/interview/route.ts` |
| Langfuse opcional y sin fallo si falta | `.env.example`, `apps/agent-runtime/src/workflow/observability.ts` |

### 6.2 Requiere ensayo en vivo del equipo

1. Todo el flujo de punta a punta con cronómetro y los tiempos reales por segmento (sección 3.1).
2. Que el chat con worker y base de datos responda en menos de unos segundos por turno, con y sin LLM.
3. Que el texto libre del mensaje de intake llene los campos esperados (con LLM) y que el modo determinista avance con chips.
4. Que la lectura de un CV en PDF funcione y muestre las habilidades.
5. Que Camila vea vacantes con "Te falta" y "Casi listas para ti", y que Ricardo vea la ruta con cursos (depende del catálogo y del solver).
6. Qué vacante activa el gate de orientación y cuál motivo se muestra.
7. Que la lista corta devuelva 200 con la cuenta de empresa elegida.
8. Que haya al menos una traza visible en Langfuse.

### 6.3 Discrepancias y riesgos encontrados

- **RIESGO — la empresa podría no ver la postulación creada desde la UI.** El runtime solo lista y deja decidir a la empresa dueña de la postulación (`employerOwns`: falla cerrado si el borrador no trae organización). El flujo del candidato (`NewApplication` / `createDraftFromMatch`) no envía `employerOrgId`, así que el borrador creado con "Preparar mi postulación" no tendría organización y `/empresa` podría mostrar "No hay postulaciones pendientes". Tampoco envía `candidateDisplayName`, por lo que orientación vería "Candidato/a" en lugar del nombre. Confirmar en el ensayo; si se confirma, abrir un issue antes del congelamiento (por ejemplo, completar la organización desde el catálogo en el runtime) o usar el clip del Plan B.
- **RIESGO — Langfuse.** La ruta de ejecución del flujo de agentes no está montada en el servidor de postulaciones ni en el web; las acciones de la UI probablemente no producen trazas. Ver 3.5.
- **RIESGO — lista corta y organización.** `ownerOf` devuelve `employer_org_<entorno>`, mientras las empresas de `seed:demo` pertenecen a `seed_org_NN`. Ver 3.3.
- **Inicio de la demo.** "Empezar" en `/` lleva a `/cuenta` para visitantes sin sesión (y de ahí "Seguir como invitado" a `/chat`), pero el test J1 (`apps/web/e2e/intake-explore.spec.ts`) espera que "Empezar" abra directamente "Conversemos sobre ti". El test parece desactualizado; el runbook sigue el código.
- **Tests visuales UC-01 a UC-06 desactualizados.** Buscan `#intake-text`, "Analizar mi perfil" y "Guardar y buscar vacantes", que no existen en el código actual del web; no sirven como evidencia de esta demo. [`old/how-to/e2e-casos-de-uso.md`](old/how-to/e2e-casos-de-uso.md) describe esa interfaz anterior (intake por texto en la portada).
- **Chat y modo memoria.** La documentación e2e dice que el servidor de la suite corre con `WORKBRIDGE_PERSISTENCE=memory` sin worker; con el chat asíncrono actual, esa combinación no procesa turnos. La demo necesita Postgres y `npm run start:worker`.
- **Contraseña compartida.** Está en `DEMO_PASSWORD` (archivo de semillas) y la imprime `seed:demo`; por política no se copia aquí. Las cuentas de `seed:roles` no tienen contraseña.
- **Preferencia del chip "Todavía no" en experiencias.** Para el guion se usa texto libre en ese paso; el chip "Todavía no" saltaría la experiencia.
- **Rúbrica.** Los nombres exactos de los criterios no están en el repositorio; la columna "Gana" usa los conceptos de la regla de oro.
