# Entrega oficial — Hackathon de Agentes de IA

## Identificación

| Campo | Valor |
|---|---|
| Reto | 3 — Empleabilidad |
| Sistema | WorkBridge |
| Equipo | Querube Ariza, Mateo Del Giudice, Jhoumar Barria |
| Modalidad | Presencial, 24 horas continuas |
| Evaluación | CONTECS 2026 |

## Cumplimiento de requisitos mínimos

| Requisito oficial | Implementación | Evidencia |
|---|---|---|
| Mínimo 3 agentes | Cinco agentes: Exploration, Profile and Evidence, Market and Matching, Bias Auditor, Training | [Arquitectura](../reference/agents/architecture.md), `apps/agent-runtime/src/workflow/graph.ts` |
| Herramienta que actúa | Matching determinístico, cálculo de rutas y verificación de credenciales; el envío externo requiere aprobación humana | [Contratos](../reference/assumed-contracts.md), [runtime](../how-to/application-runtime.md) |
| Componente determinístico | HiGHS, reglas de elegibilidad, restricciones de transporte y verificación de credenciales | [Arquitectura](../reference/agents/architecture.md) |
| Humano en el ciclo | Candidato, orientador y empleador aprueban decisiones críticas | [Puntos de aprobación](../reference/agents/architecture.md#approval-boundaries) |
| Explicabilidad | Cada perfil, brecha, aptitud y restricción conserva evidencia y estado | [Glosario](../reference/employability-glossary.md) |
| Trazabilidad | Envelopes, spans de Langfuse y auditoría append-only | [Arquitectura](../reference/agents/architecture.md) |
| Evals propios | Casos de credenciales, matching, perfil y auditoría de sesgo; la ejecución final debe registrar resultados por commit | [README raíz](../../README.md#evals), tests enlazados allí |
| Guardrails | Bloqueo de prompt injection, PII, promesas, datos inventados y acciones no autorizadas | [Evals LLM](../reference/frontend/testing.md#llm-behavioral-eval-set-r8), `guardrails.test.ts` |

## Alcance implementado y límites

### Implementado y demostrable

- Extracción de perfiles y experiencia informal.
- Normalización de vacantes y habilidades.
- Matching con restricciones de aptitud, horario, salario y transporte.
- Auditoría contrafactual de sesgo sobre atributos protegidos y bloqueo de vacantes afectadas.
- Ruta de formación basada en brechas.
- Verificación de credenciales con fallback controlado.
- Borrador de postulación con aprobación del candidato.
- Rechazo de acciones no autorizadas y registro de decisiones.

### No presentado como implementado

- Integraciones reales de WhatsApp, notas de voz y envío automático de mensajes.
- La entrevista simulada como agente del grafo principal; existe un módulo de entrevista, pero debe demostrarse en el flujo oficial antes de declararlo parte de la demo.

Estos límites se declaran para evitar que la demo prometa capacidades que no están en el tag de congelamiento.

## Fuentes y datos

La demo usa fixtures y catálogo local para ser reproducible. Estas fuentes externas sustentan el problema panameño y delimitan los datos usados en la demo:

| Dato | Fuente | Fecha de consulta | Uso |
|---|---|---|---|
| Desempleo juvenil | [INEC, EML septiembre 2025](https://www.inec.gob.pa/archivos/P053342420260304100837Cuadro%204.pdf) | 2026-10-17 | Justificación del problema; tasas por edad |
| Empleo e inserción juvenil | [MITRADEL, Mi Primer Empleo y pasantías](https://www.mitradel.gob.pa/programa-de-pasantias-impulsara-la-insercion-laboral-y-el-desarrollo-de-habilidades-profesionales-de-jovenes-panamenos/) | 2026-10-17 | Contexto de inserción laboral |
| Cursos y centros de formación | [INADEH, oferta académica 2025](https://www.inadeh.edu.pa/wp-content/uploads/2025/01/OfertaAcademica2025.pdf) | 2026-10-17 | Ruta de formación y centros de La Chorrera/Tocumen |
| Transporte y tiempos de traslado | Fixture reproducible del repositorio; validar con fuente operativa antes de la entrega | 2026-10-17 | Restricción de matching |
| Vacantes | Catálogo/fixtures documentados en el repositorio | 2026-10-17 | Demo y evals |

## Entregables de la hora 24

| Entregable | Ubicación / evidencia | Estado |
|---|---|---|
| Repositorio | Este repositorio | ✅ |
| Tag `final-24h` | `git show final-24h` | Verificar antes de entregar |
| README | [`README.md`](../../README.md) | ✅ |
| Diagrama | [`architecture.md`](../reference/agents/architecture.md) | ✅ |
| Evals | [`README.md#evals`](../../README.md#evals) y tests | ✅, ampliar resultados agregados |
| Bitácora de IA | [`README.md#bitácora-de-ia`](../../README.md#bitácora-de-ia) | ✅ |
| Metodología | [`metodologia.md`](metodologia.md) | ✅ |
| Video ≤ 3 minutos | Enlace oficial de entrega | Pendiente de adjuntar |

## Guion de demo

1. El candidato pega un CV o declara experiencia informal.
2. WorkBridge normaliza el perfil y muestra la evidencia.
3. Se carga una vacante con salario, horario y ubicación.
4. Matching calcula aptitud, brechas y transporte de forma determinística.
5. Training propone una ruta compatible con tiempo, costo y cupos.
6. El candidato revisa y aprueba el borrador.
7. El sistema registra la decisión, la trazabilidad y el resultado.
