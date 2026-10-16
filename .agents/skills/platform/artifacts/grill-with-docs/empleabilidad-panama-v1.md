# Grill With Docs: Empleabilidad Panamá v1

**Status: Refined and ready for specification.**

The remaining Certo deployment/API check is an implementation validation, not a design blocker; the transparent mock adapter is already defined.

## Certo integration research

The project will use [Schroedinger-Hat/certo](https://github.com/Schroedinger-Hat/certo) as the primary credential verifier. The repository describes an open-source platform for issuing, managing and verifying digital credentials based on:

- Open Badges 3.0;
- W3C Verifiable Credentials;
- decentralized identifiers;
- cryptographic proofs and tamper evidence;
- revocation lists;
- public verification pages;
- evidence attachments and endorsements.

Certo is a credential platform, not proof that every external certificate is supported. We will deploy it as a separate service/repository outside the application monorepo and integrate through its documented public verification/API surface. We will not copy Certo source code into the application repository or invent an endpoint before the deployed contract is confirmed.

Certo is licensed AGPL-3.0, so attribution and license obligations must be reviewed before deployment or modification.

The application will communicate with the separate Certo deployment through a private HTTPS API using `CERTO_BASE_URL` and `CERTO_API_TOKEN`. The integration will enforce timeouts, idempotent retries, Ajv response validation, `trace_id`, a circuit breaker and automatic mock fallback. The Certo token will never reach the browser.

Verification results are normalized across three dimensions:

1. document integrity;
2. cryptographic proof;
3. issuer trust and revocation status.

Normalized states are:

- `verified`: all three dimensions pass;
- `partially_verified`: proof passes but trust or revocation is incomplete;
- `declared`: supplied only by the candidate;
- `unverified`: could not be checked;
- `rejected`: invalid proof, tampering or revocation detected.

A mandatory credential counts as satisfied only when it is `verified`.

All Certo, Accredible and Credly adapters must emit the same provider-agnostic contract before matching:

```json
{
  "status": "verified",
  "document_integrity": true,
  "cryptographic_proof": true,
  "issuer_trust": true,
  "revocation_status": "not_revoked",
  "provider": "certo",
  "evidence": []
}
```

The solver never depends on provider-specific response formats.

### Credential ownership

Credential validity and candidate ownership are separate checks. A credential is `verified` only when its authenticity/revocation and `holder_binding` both pass. If ownership cannot be established, the result is `partially_verified`, never `verified`.

The candidate may provide additional evidence, but only a counselor may approve an exception. Full identity data is compared through pseudonymized backend identifiers and is never sent to the LLM.

The adapter will record issuer, credential format, proof result, revocation result, evidence and provider status. It will distinguish `verified`, `declared`, `unverified` and `rejected`; a missing issuer trust or revocation signal cannot be represented as verified.

Implementation remains dual-mode: use the real Certo integration when deployed and authorized; otherwise use `CertoVerifier` with deterministic mock fixtures and clearly mark `externally_verified: false`.

## Primary use case: What jobs can I apply to?

**Actor:** Young candidate without a strong CV or with informal experience.

1. Upload a CV photo/PDF or describe experiences.
2. Describe projects, family work, volunteering or previous employment.
3. The Profile Agent identifies technical skills, soft skills, estimated level and missing evidence.
4. The candidate selects work preferences.
5. The Exploration Agent finds compatible vacancies.
6. The Market Agent analyzes requirements.
7. Google Maps validates transport and location.
8. The solver ranks the best vacancies.
9. The Training Agent recommends courses, projects or internships.
10. The system generates a personalized roadmap.

### Candidate preferences

Before vacancy search, the candidate explicitly selects:

- target areas or roles;
- work modality;
- maximum acceptable location;
- maximum travel time;
- maximum daily transport cost;
- minimum salary;
- availability schedule;
- contract type;
- available transport modes;
- willingness to take courses or internships.

These preferences become solver inputs and are never inferred by the LLM.

### Skills taxonomy

Se usará una taxonomía híbrida:

- **ESCO** como referencia principal;
- diccionario local panameño para cargos, herramientas y expresiones laborales locales;
- sinónimos en español e inglés.

Cada habilidad conservará `skill_id`, nombre canónico, sinónimos, nivel, evidencia, fuente y confianza. El LLM propondrá el mapeo, pero la habilidad canónica se validará antes de llegar al solver y siempre se conservará el término original.

### Skill levels

Los niveles serán ordinales:

```text
0 — No evidenciado
1 — Básico
2 — Funcional
3 — Avanzado
4 — Experto / capaz de enseñar
```

El nivel requiere evidencia; una habilidad únicamente declarada no supera `1`; una certificación verificada no implica automáticamente nivel experto. La comparación candidato–vacante será determinística. El candidato puede corregir el nivel propuesto y el counselor revisa discrepancias relevantes.

### Vacancy source: Apify LinkedIn Jobs Actor

The approved integration uses the Apify Actor API for `bebity/linkedin-jobs-scraper` as a **catalog update source**, not as a critical live dependency.

Pipeline:

```text
candidate preferences
→ Apify Actor API
→ Ajv response validation
→ remove recruiter/personal data
→ normalize requirements
→ deduplicate
→ cache snapshot
→ Exploration Agent
```

Constraints:

- public vacancies only;
- Panama Metro and Panama Oeste;
- 15–30 results per run;
- configured Apify cost cap;
- `enrichCompany` disabled;
- closed vacancies ignored;
- `jobUrl`, query date and `scrapingInfo` retained for provenance;
- provider, cost, timestamp and errors recorded;
- manual vacancy import remains the fallback;
- competition rules and applicable terms must be checked before use.

Deduplicate by `jobUrl` or `jobId`. Do not retain recruiter profiles, photos or unnecessary personal data.

Vacancy freshness is explicit:

- `fresh`: less than 24 hours;
- `stale`: 24–72 hours, usable with a warning;
- `expired`: more than 72 hours, excluded from automatic recommendations;
- closed or removed: removed immediately when detected.

The UI always shows each vacancy's last-updated timestamp.

### Sin coincidencias viables

Cuando no exista una vacante compatible, el sistema mostrará claramente que no se encontró una oportunidad viable y explicará las causas: habilidades, salario, transporte, horario o certificación.

Solo podrá relajar preferencias blandas. Nunca relajará restricciones duras silenciosamente. Podrá mostrar coincidencias cercanas con advertencias, activar el Agente de Formación para crear un roadmap y guardar una alerta para futuras búsquedas. No inventará vacantes ni ocultará restricciones.

### Alertas

El candidato podrá guardar su búsqueda y preferencias. Una actualización manual o programada del catálogo detectará nuevas coincidencias y las mostrará dentro del panel, registrando los eventos en el event store.

Email, WhatsApp y SMS quedan fuera del MVP.

### Idioma

La interfaz y las explicaciones para candidatos, empresas y orientadores estarán en español. Los JSON Schemas, estados internos, eventos, trazas y documentación técnica estarán en inglés.

El sistema mostrará evidencia, reglas aplicadas y decisiones verificables; nunca expondrá el razonamiento privado del LLM.

### Accesibilidad

El MVP tendrá navegación por teclado, etiquetas accesibles, contraste suficiente, texto ampliable, errores claros, indicadores que no dependan solo del color, alternativas textuales para imágenes y audio, soporte básico para lectores de pantalla y uso móvil.

### Criterios de readiness

El MVP podrá congelarse cuando:

1. complete el flujo principal en menos de 3 minutos;
2. los cuatro agentes se comuniquen mediante el workflow graph;
3. ejecute al menos una herramienta real: Google Maps, Apify, escritura PostgreSQL o HiGHS;
4. pase los 15 casos de verificación;
5. ejecute los 10 casos de guardrails;
6. cumpla el 100% de restricciones duras;
7. no envíe postulaciones sin aprobación;
8. muestre el `trace_id` completo;
9. demuestre los tres estados de aptitud;
10. ejecute correctamente el fallback de OpenRouter;
11. funcione localmente con Docker Alpine y tenga respaldo Vercel/Neon;
12. no contenga secretos reales.

**Estado:** En refinamiento; política de verificación confirmada, integración pendiente.

## Diseño bajo revisión

**Puente Laboral Panamá** evaluará si una persona es apta para una vacante, reconocerá experiencia formal e informal, identificará brechas y propondrá una ruta accionable antes de postular.

Flujo propuesto:

1. Capturar CV, certificaciones, cursos, proyectos y experiencias.
2. Normalizar perfil y evidencias.
3. Analizar los requisitos de una oferta.
4. Calcular aptitud con reglas determinísticas.
5. Explicar aptitud, brechas y riesgos.
6. Proponer cursos, certificaciones o pasantías.
7. Generar CV y postulación adaptados.
8. Solicitar aprobación humana antes de ejecutar acciones externas.

## Agentes propuestos

- **Agente de Exploración:** permite tantear oportunidades y descubrir empleos plausibles sin postular automáticamente.
- **Agente de Perfil y Evidencia:** interpreta CV, certificaciones, cursos, proyectos y experiencia informal.
- **Agente de Mercado y Matching:** normaliza requisitos, ejecuta el evaluador determinístico, construye el roadmap y prepara la postulación.

## Componentes determinísticos

- requisitos obligatorios y deseables;
- habilidades y niveles;
- evidencia de certificaciones;
- transporte, horario y salario;
- ranking de cursos y pasantías por cobertura de brecha, costo, cupo y accesibilidad;
- auditoría de estabilidad ante cambios de nombre, género o corregimiento.
- clasificación de verificaciones en verdaderos positivos, verdaderos negativos, falsos positivos y falsos negativos.

## Política de verificación de certificaciones

Se usará una cadena ordenada de verificadores:

1. **certo** como primera opción.
2. **Accredible** para certificados que certo no pueda verificar.
3. **Credly** como alternativa posterior para certificados todavía no verificados.

El sistema conservará el proveedor consultado, la evidencia, el resultado y el motivo del fallback. Los estados visibles serán:

- `verified`;
- `declared`;
- `unverified`;
- `rejected`.

Nunca se afirmará autenticidad si no existe evidencia verificable.

### Verificación prioritaria con certo

El adaptador de `certo` modelará cinco etapas:

1. Extraer el documento y la identidad del emisor.
2. Verificar la firma del emisor usando su clave pública.
3. Comprobar la integridad del documento.
4. Comprobar la identidad criptográfica del firmante.
5. Comprobar confianza y revocación del certificado.

La evidencia mínima almacenada será:

- `document_integrity`;
- `signer_identity`;
- `certificate_status`.

Fuente declarada: [certo.com](https://github.com/Schroedinger-Hat/certo).

Para la demo se usará un adaptador común y, si no existen credenciales o API disponibles, un mock determinístico que reproduzca esas etapas sin afirmar que realizó una verificación externa real.

## Ground truth para la evaluación

Se confirmó un conjunto mínimo de **15 casos** con resultado real conocido. El conjunto debe incluir:

1. firma válida y emisor confiable;
2. firma válida con certificado revocado;
3. certificado expirado;
4. documento alterado;
5. firma inválida;
6. firmante desconocido;
7. identidad del emisor inconsistente;
8. datos del certificado inconsistentes;
9. clave pública ausente;
10. formato no soportado;
11. `certo` no disponible con fallback a Accredible;
12. Accredible no disponible con fallback a Credly;
13. todos los proveedores no disponibles;
14. certificado declarado sin evidencia;
15. credencial duplicada o reutilizada.

Cada caso registrará:

- `ground_truth`;
- `predicted_label`;
- `provider_used`;
- evidencia observada;
- error o motivo del fallback.

Se calcularán matriz de confusión, precisión, recall, tasa de falsos positivos, tasa de falsos negativos y tasa de fallback.

## Política de aptitud laboral

Se confirmó que el sistema no usará únicamente una decisión binaria. Entregará tres estados:

- **Apto:** cumple requisitos obligatorios y restricciones prácticas.
- **Apto con brechas:** puede avanzar, pero necesita acciones concretas para cerrar brechas.
- **No apto actualmente:** incumple una restricción dura, como una certificación obligatoria no verificada, horario incompatible o transporte inviable.

El estado se calculará con requisitos normalizados, evidencia y reglas determinísticas; el LLM solo ayudará a interpretar entradas y explicar resultados.

Los estados **Apto con brechas** y **No apto actualmente** deben producir un roadmap con cursos, certificaciones, proyectos o pasantías recomendadas.

## Ponderación confirmada del matching

El puntaje total usa:

```text
30% habilidades técnicas y requisitos
25% experiencia y evidencia
15% disponibilidad y horario
20% transporte y accesibilidad
10% salario y condiciones
```

Las restricciones duras tienen precedencia sobre el puntaje total.

El 25% de experiencia incluye trabajo formal e informal, proyectos, voluntariado, pasantías, portafolio y habilidades blandas demostradas. Estas incluyen comunicación, trabajo en equipo, resolución de problemas, responsabilidad, adaptabilidad, liderazgo y organización.

Las habilidades blandas se valoran por relevancia, calidad de evidencia, recencia, nivel de responsabilidad y transferibilidad. Una habilidad blanda únicamente declarada recibe peso limitado y puede requerir entrevista o evidencia adicional. No se cuenta dos veces dentro de requisitos técnicos.

## Umbrales de aptitud

Se confirmaron estos rangos:

- `75–100`: **Apto**;
- `50–74`: **Apto con brechas**;
- `0–49`: **No apto actualmente**.

Una restricción dura puede producir **No apto actualmente** sin importar el puntaje. Toda clasificación debe mostrar el puntaje, las restricciones aplicadas y su explicación.

### Tolerancia de frontera

Se confirmó una tolerancia de **±1 punto** como regla excepcional de promoción al tier inmediatamente superior. No es redondeo automático.

Solo puede aplicarse cuando:

- el candidato está junto al límite del siguiente tier;
- no existe una propuesta elegible mejor dentro de la propuesta o shortlist actual;
- no se viola ninguna restricción dura;
- un human reviewer aprueba la excepción.

La excepción no puede desplazar a un candidato elegible mejor ni ignorar restricciones. Se registrarán puntaje original, tier objetivo, conjunto comparado, motivo, revisor y decisión final.

### Desempate

Los empates se resolverán de forma determinística:

1. menos restricciones duras o advertencias;
2. mayor cumplimiento de requisitos obligatorios;
3. mayor evidencia de experiencia relevante;
4. menor tiempo y costo de traslado;
5. mejor compatibilidad de horario;
6. menor dependencia de credenciales no verificadas;
7. `candidate_id` estable.

No se usarán nombre, género, edad, foto, nacionalidad ni aleatoriedad. Se registrará el primer criterio que resolvió el empate.

## Ofertas discriminatorias o ambiguas

Cada alerta se clasificará como `ambiguous`, `potentially_discriminatory` o `prohibited`. Se bloquearán automáticamente requisitos claramente prohibidos; los ambiguos o potencialmente discriminatorios pasarán a revisión humana.

El sistema pedirá al empleador una reformulación objetiva y excluirá el criterio del ranking mientras esté bajo revisión. La alerta y su corrección quedarán en `audit_events`. Solo un human reviewer autorizado puede resolverla; ningún agente puede ocultarla o sobrescribirla silenciosamente.

## Privacidad, consentimiento y procedencia

El sistema pedirá consentimiento antes de guardar o enviar datos, separará datos identificatorios de las variables de ranking, excluirá nombre, género, edad, foto y nacionalidad del puntaje, permitirá corrección y eliminación, y registrará si cada dato fue declarado, extraído, verificado o inferido. Los atributos protegidos solo se conservarán cuando sean necesarios para auditar sesgo.

## Restricción geográfica

Una vacante presencial debe ser compatible con la ubicación del usuario. El solver considerará ubicación de ambas partes, medio de transporte, tiempo máximo de traslado y costo máximo aceptado.

La fuente principal de rutas será **Google Maps API**. La API calculará distancia y tiempo; el código aplicará los límites y decidirá la compatibilidad. El LLM no decidirá tiempos ni costos.

La aplicación mantendrá una matriz local determinística de respaldo para que la demo continúe funcionando si Google Maps no está disponible. La clave se configurará mediante `.env.example` y nunca se almacenará en el repositorio.

El MVP soportará transporte público, automóvil, caminata y bicicleta. Se usará el costo de Google Maps cuando esté disponible; de lo contrario, se aplicará el presupuesto declarado por el usuario junto con una tabla local de tarifas estimadas.

## Entradas aceptadas

El MVP aceptará:

- PDF;
- imágenes procesadas mediante OCR;
- texto pegado;
- audio previamente transcrito.

No se requiere audio en vivo. Todas las entradas se convertirán primero a texto y conservarán su procedencia antes de extraer perfiles, requisitos o evidencias.

## Catálogo por especialización

El catálogo inicial tendrá entre 15 y 30 oportunidades, filtradas por el área de especialización y las brechas del candidato.

Un **Agente de Formación** buscará y normalizará oportunidades públicas de plataformas como Coursera, Cisco, Edutin, edX y Udemy. Registrará nombre, proveedor, tipo, URL, costo, modalidad, duración, ubicación, prerrequisitos, habilidades cubiertas, horario, disponibilidad y fecha de consulta.

La ponderación considerará cobertura de brecha, ajuste a la especialización, costo, duración, modalidad, accesibilidad geográfica, horario, disponibilidad y relevancia de la credencial.

El agente solo consultará contenido público permitido, respetará términos y límites de cada plataforma, no evadirá controles y no inventará datos. Las oportunidades extraídas deberán poder revisarse antes de entrar al catálogo recomendado.

El flujo principal usará un **catálogo cacheado** con el último snapshot válido. El Agente de Formación podrá actualizarlo y registrar cambios sin bloquear el matching cuando una plataforma no responda o limite las consultas.

## Arquitectura de agentes y graph engineering

Se confirmó una arquitectura de cuatro agentes especializados:

1. Exploración.
2. Perfil y Evidencia.
3. Mercado y Matching.
4. Formación.

El MVP sí aplica **graph engineering**, específicamente como un **workflow graph**: estados, transiciones, dependencias, herramientas y puntos de aprobación humana se representan explícitamente. El sistema no necesita todavía un knowledge graph completo; la taxonomía de habilidades y el catálogo pueden mantenerse como datos estructurados. Un grafo de conocimiento puede incorporarse después si aporta valor real.

El estado compartido incluirá perfil, requisitos, evidencias, verificaciones, restricciones, matches, roadmap, decisiones humanas y trazas.

## Stack tecnológico

Se confirmó **TypeScript** como lenguaje y **Mastra** como framework de agentes.

Mastra aporta en un solo paquete nativo de TypeScript:

- agentes con herramientas;
- workflows en grafo (`.then`, `.branch`, `.parallel`);
- `suspend/resume` para la aprobación humana;
- evaluaciones integradas;
- guardrails;
- trazabilidad con Langfuse y OpenTelemetry;
- Studio local para la demo en vivo.

Está construido sobre el **Vercel AI SDK**. Se descartó **LangGraph.js** como opción principal porque exigiría ensamblar por separado evals, guardrails y UI dentro de la ventana de 24 horas.

Fuente: [mastra.ai](https://mastra.ai/).

Quedan por confirmar: frontend, base de datos, ORM, solver, OCR, modelos LLM y despliegue.

### Interfaz y persistencia

- **Panel:** Next.js con App Router y shadcn/ui.
- **Base de datos:** PostgreSQL.
- **ORM:** Prisma.
- **Respaldo:** SQLite con Prisma si Docker no está disponible durante el evento.

Modelos base: `candidates`, `jobs`, `matches`, `human_reviews`, `audit_events`.

### Solver determinístico

Motor principal: **`highs-js`** (HiGHS vía WebAssembly, MIT), con **fallback greedy** en TypeScript puro y **`javascript-lp-solver`** como plan B.

- **Matching:** `x[candidato, vacante]` binaria; maximiza compatibilidad ponderada con restricciones de cupos, transporte, horario, salario y requisitos obligatorios.
- **Roadmap:** `y[curso]` binaria; maximiza cobertura de brechas sujeto a costo, duración y disponibilidad.

El solver es el componente determinístico central; el LLM no participa en la decisión.

### Entrada de documentos

Pipeline híbrido:

1. `unpdf` para PDF con texto;
2. modelo de visión para imágenes, fotos y manuscritos;
3. `tesseract.js` como fallback offline.

La procedencia se conserva en cada etapa.

### Proveedor de LLM y failover

Proveedor único: **OpenRouter**, integrado con el Vercel AI SDK dentro del router de Mastra.

Dos capas de failover:

- **Proveedor:** automática por defecto; mantiene un modelo vivo cambiando de proveedor.
- **Modelo:** arreglo `models` en orden de prioridad; se activa por rate limit, longitud de contexto, moderación y caídas. Las peticiones fallidas no se cobran.

Capa de orquestación inspirada en Pi:

- mismo proveedor primero, luego otros;
- estrategia `next_key_then_provider`;
- swap pegajoso por sesión;
- puntero solo hacia adelante;
- compactación antes de cambiar a menor contexto;
- modelo piso al final de cada cadena.

Cadenas por agente: visión/extracción, entrevista, normalización/clasificación y explicación, cada una con su propia lista de modelos.

Presupuesto de tokens por agente, porque la cuota de OpenRouter es compartida.

Fuentes: [OpenRouter model fallbacks](https://openrouter.ai/docs/guides/routing/model-fallbacks), [pi-provider-fallback](https://pi.dev/packages/pi-provider-fallback).

### Observabilidad y trazabilidad

Dos capas más un event store:

- **Langfuse** vía OpenTelemetry desde Mastra: prompts, herramientas, tokens, latencia, reintentos y fallbacks de modelo.
- **`audit_events`** append-only en PostgreSQL: matching, restricciones aplicadas, verificación de certificados y aprobación humana.
- **Event store consultable (DQL)** con estados `pending`, `success` y `failed`.

Reglas: un `trace_id` se propaga a perfiles, matches, roadmap y decisiones; cada decisión registra agente, herramienta, restricción y evidencia; el fallback de modelo se registra con modelo intentado y motivo; Mastra Studio sirve de visor local en la demo.

### Event store y DQL

Se implementan **dos** capacidades:

1. **Domain Query Language (DQL):** capa de solo lectura sobre el event store, con vistas derivadas `events.failed`, `events.pending` y `events.by_trace(trace_id)`.
2. **Dead-letter Queue Log:** flujo dedicado para eventos fallidos, con inspección de error, reintento manual o programado y trazabilidad.

Estados:

- `pending`: esperando aprobación humana o reintento programado.
- `success`: acción completada.
- `failed`: agotó reintentos y queda en la cola dead-letter.

Campos: `id`, `trace_id`, `agent`, `tool`, `type`, `payload`, `status`, `attempts`, `error`, `created_at`, `updated_at`, `next_retry_at`.

`audit_events` conserva la verdad append-only; el event store modela las transiciones de estado.

### Despliegue

Despliegue principal: **Docker Compose con imágenes basadas en Alpine**.

Servicios:

- aplicación Next.js + Mastra;
- PostgreSQL Alpine;
- Langfuse self-hosted opcional.

Respaldo: frontend en Vercel y PostgreSQL gestionado por Neon. `.env.example` documentará la configuración sin incluir credenciales reales.

Antes de congelar el stack se validará la compatibilidad de Prisma, OCR nativo y módulos Node con Alpine. Si una dependencia lo exige, solo ese servicio podrá usar una imagen compatible basada en Debian; no se cambiará todo el stack innecesariamente.

### Monorepo y dependencias

Se usará **npm workspaces**. La estructura propuesta es:

```text
apps/web
apps/agent-runtime
packages/domain
packages/solver
packages/ingestion
packages/db
packages/observability
```

Esto conserva los límites de un monorepo y permite compartir tipos derivados de los contratos JSON entre Next.js, Mastra y el solver, usando npm como gestor solicitado.

### Contratos entre agentes

Se usará **JSON Schema 2020-12 como única fuente de contratos**, validado en runtime con **Ajv**. No se utilizará Zod.

Los contratos serán archivos JSON versionados y validados en runtime mediante un validador de JSON Schema. Cubrirán:

- `CandidateProfile`;
- `JobRequirements`;
- `CredentialVerification`;
- `MatchDecision`;
- `TrainingOpportunity`;
- `Roadmap`;
- `ApplicationDraft`;
- `HumanApproval`;
- `EventRecord`.

Esto permite que los agentes intercambien datos estructurados sin depender de texto ambiguo.

### Autenticación y roles

Se confirmó **Better Auth** con el adaptador Prisma sobre PostgreSQL/Neon.

Roles iniciales:

- `candidate`;
- `employer`;
- `counselor`.

La demo tendrá cuentas preconfiguradas, pero usará sesiones normales y validación server-side. Se protegerán las rutas por rol y se exigirá consentimiento antes de persistir o enviar información. No se guardarán credenciales reales en el repositorio.

La integración de middleware usará runtime Node.js para validar sesiones en el servidor. Better Auth se configurará como paquete externo del servidor de Next.js.

Better Auth es preferible al sistema anónimo inicialmente propuesto porque el producto ya requiere consentimiento, aprobación humana, separación de roles y trazabilidad de quién tomó cada decisión.

### Autorización de decisiones

Se confirmó el siguiente modelo:

- El **candidato** siempre aprueba el envío de su propia postulación.
- El **counselor / human reviewer** aprueba brechas críticas, credenciales no verificadas, alertas de sesgo o transporte inviable, y puede corregir decisiones de agentes.
- El **employer** aprueba la shortlist antes de avanzar a entrevista.
- Los agentes pueden preparar, explicar y enrutar decisiones, pero no pueden superar los gates de aprobación.

Cada aprobación, corrección o rechazo registra actor, rol, timestamp, `trace_id` y motivo.

### Límites de runtime

Se confirmó la separación entre interfaz y agentes:

- `apps/web`: Next.js, UI, sesiones y API BFF;
- `apps/agent-runtime`: Mastra, agentes, workflows y herramientas;
- `packages/domain`: JSON Schemas y contratos;
- `packages/solver`: HiGHS y fallback determinístico;
- `packages/db`: Prisma y repositorios.

El frontend no controla directamente los agentes ni el solver.

### Comunicación entre servicios

Se confirmó HTTP interno:

- REST para iniciar workflows y consultar resultados;
- SSE para transmitir progreso, estados y eventos;
- JSON Schema 2020-12 + Ajv en cada request y response;
- `trace_id` e `idempotency_key` obligatorios;
- secreto interno service-to-service;
- reintentos con idempotencia para acciones sensibles.

Kafka, WebSockets y gRPC quedan fuera del MVP para reducir riesgo.

### Gestión de secretos

Se confirmó que `.env.example` documentará nombres y valores ficticios, mientras los secretos reales vivirán únicamente en archivos locales ignorados por Git o en el gestor de secretos del despliegue.

Las claves nunca llegarán al navegador. La clave de Google Maps tendrá restricciones por dominio/IP y cuota. Web y `agent-runtime` usarán un secreto separado. La aplicación validará variables obligatorias al arrancar y ofrecerá mocks para pruebas y desarrollo.

Variables principales: `OPENROUTER_API_KEY`, `GOOGLE_MAPS_API_KEY`, `BETTER_AUTH_SECRET`, `DATABASE_URL` y `AGENT_RUNTIME_SECRET`.

### Guardrails

Se confirmó un diseño de cuatro capas:

```text
input processors
→ tool-result processors
→ permissioned tools
→ output schema and policy validation
```

CVs, ofertas, PDFs, OCR, transcripciones, scraping, credenciales, salidas de agentes y resultados externos son datos no confiables, nunca instrucciones.

Las entradas pasan por validación MIME/tamaño, detección de contenido inseguro, PII y procedencia, prompt injection, alcance del dominio y JSON Schema. Los resultados de herramientas pasan por detección de injection, procedencia, schema e integridad de credenciales.

Cada herramienta declara agentes y roles autorizados, permisos, schemas, límites, `trace_id` y nivel de riesgo:

- bajo: leer catálogo cacheado;
- medio: consultar Google Maps;
- alto: escribir match o roadmap;
- crítico: enviar postulación, siempre con aprobación humana.

El LLM puede interpretar, extraer y explicar. No puede autenticar credenciales, calcular aptitud, alterar rankings, ignorar restricciones, aprobar envíos ni inventar oportunidades.

Los bloqueos se registran en Langfuse, `audit_events` y el event store. El ciclo de eventos soporta `pending`, `success`, `failed`, `rejected`, `retrying` y `dead_letter`.

Se añadirán 10 casos de eval para prompt injection, abuso de herramientas, secretos, entradas fuera de dominio, archivos inválidos y bypass de aprobación. Mastra usará processors, pero JSON Schema 2020-12 + Ajv seguirán siendo la fuente única de contratos; se validará esta adaptación en un spike temprano.

### Política refinada de modelos

Se usará un **model registry** versionado y configurable por capacidades, no solo una lista de nombres.

Cada entrada declarará:

- `model_id` y proveedor;
- capacidades: visión, tools, conversación y structured output;
- ventana de contexto;
- máximo de salida;
- tier de costo;
- estado habilitado.

Cada agente exigirá capacidades mínimas. Por ejemplo, extracción requiere visión + structured output; entrevista requiere conversación + tools; normalización y explicación requieren structured output.

Los fallbacks:

- deben soportar las mismas capacidades;
- siguen un orden forward-only;
- no reintentan un modelo fallido en la misma ejecución;
- compactan contexto antes de cambiar a una ventana menor;
- preservan el contrato JSON;
- terminan en un modelo piso económico que aún cumpla el contrato.

Cada workflow tendrá límites de tokens por llamada, llamadas por agente, tokens totales, costo total y timeout. El registro capturará modelo, motivo del fallback, intento, tokens, costo estimado y latencia.

Los modelos no se fijarán en el código ni se usará `openrouter/auto` para rutas críticas. Se elegirán al desplegar desde una allowlist versionada; el arranque rechazará configuraciones que no cumplan capacidades o presupuestos. Aptitud, matching, verificación y autorización siempre tendrán una ruta determinística o humana si falla el LLM.

Antes de la demo y del despliegue se ejecutará un **model preflight** que verificará disponibilidad, structured output, tool calling, visión, ventana de contexto, latencia, costo estimado y la cadena de fallback.

Un modelo que falle será deshabilitado antes de iniciar el workflow y se promoverá el siguiente fallback compatible. El sistema conservará un reporte con modelos, capacidades, timestamp, resultados y entradas deshabilitadas.

### Protección de PII

Se confirmó un **PII vault local**. El sistema detectará nombre, correo, teléfono, dirección y documentos de identidad; los reemplazará por tokens como `CANDIDATE_001` antes de enviar contexto a OpenRouter.

El mapa token-identidad permanecerá en PostgreSQL. Solo el paso de generación de una postulación ya aprobada podrá rehidratar los campos autorizados. Documentos de identidad, secretos e identificadores sensibles sin necesidad funcional nunca se enviarán al LLM. Cada redacción quedará registrada.

### Retención

Se confirmó que los datos de demo se eliminarán al finalizar la sesión. Los documentos originales vivirán solo mientras el workflow los requiera; perfiles y matches se conservarán durante la demo para trazabilidad; las trazas técnicas se conservarán redactadas; los eventos de auditoría se mantendrán hasta cerrar la evaluación. El candidato podrá solicitar eliminación manual desde el panel.

### Testing

Se confirmó:

- **Vitest** para unitarias y solver;
- **Playwright** para el flujo end-to-end;
- fixtures JSON para los casos de verificación y matching;
- contract tests con Ajv;
- pruebas de regresión para los 15 casos de ground truth, sesgo, guardrails, fallbacks y restricciones geográficas.

Estructura:

```text
tests/unit
tests/contracts
tests/e2e
tests/evals
tests/fixtures
```

Esta compatibilidad será una restricción dura o una advertencia explícita según los límites declarados por el usuario. En empleos híbridos se considerarán los días presenciales; en empleos remotos, las condiciones presenciales requeridas.

## Política del roadmap

Se confirmó que el roadmap utilizará un **catálogo curado**. El LLM no podrá inventar cursos, certificaciones, proyectos ni pasantías.

Cada elemento del catálogo tendrá:

- nombre y proveedor;
- tipo;
- costo;
- modalidad;
- duración;
- ubicación;
- prerrequisitos;
- habilidades cubiertas;
- cupos disponibles;
- horario.

El solver seleccionará y ordenará las opciones usando cobertura de brecha, restricciones de transporte y horario, costo, cupos, accesibilidad y esfuerzo esperado. El LLM solo explicará y personalizará la ruta resultante.

## Política de postulación

Los agentes se encargarán del flujo operativo, pero el envío tendrá una barrera humana explícita:

1. **Borrador:** se genera CV, carta y respuestas.
2. **Pendiente de aprobación:** el joven u orientador revisa los datos y cambios.
3. **Aprobado:** una herramienta autorizada ejecuta el envío.
4. **Rechazado:** no se envía y se registra el motivo.

Los agentes no podrán enviar sin aprobación, inventar credenciales o experiencia, ni modificar evidencia verificada.

## Política de experiencia declarada

El usuario podrá describir libremente experiencias de empleos anteriores, trabajos informales, negocios familiares, proyectos, voluntariado o trabajos académicos.

El sistema las clasificará como:

- `relevant`;
- `partially_relevant`;
- `not_relevant`;
- `requires_additional_evidence`.

El agente podrá traducir la descripción a habilidades, contexto, nivel estimado y evidencia relacionada con una vacante. Sin embargo, una experiencia declarada nunca se convertirá automáticamente en una certificación. El solver determinará cuánto pesa según los requisitos de la oferta.

La matriz de evaluación debe distinguir:

- verdadero positivo: certificado auténtico identificado como válido;
- verdadero negativo: certificado no válido identificado como no válido;
- falso positivo: certificado no válido aceptado;
- falso negativo: certificado válido rechazado o no reconocido.

## Documentación candidata

- Glosario: aptitud, evidencia, brecha, roadmap, experiencia informal y postulación adaptada.
- ADR sobre alcance y nivel de verificación de certificaciones.
- ADR sobre autonomía y aprobación humana.
- Actualización de `CONTEXT.md` con actores, vocabulario y fronteras.

## Pregunta actual

¿Qué API, URL de verificación o formato de credencial ofrece `certo` para la integración?

**Recomendación:** implementar un adaptador con contrato común y un mock determinístico de las etapas criptográficas para la demo; conectar la integración real solo si las credenciales, límites y documentación están disponibles durante el evento.

No se actualizan todavía `CONTEXT.md`, el glosario ni ADRs porque esta decisión aún no está confirmada.
