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
| Mínimo 3 agentes | Cuatro agentes: Exploration, Profile and Evidence, Market and Matching, Training | [Arquitectura](../reference/agents/architecture.md), `apps/agent-runtime/src/workflow/graph.ts` |
| Herramienta que actúa | Matching determinístico, cálculo de rutas y verificación de credenciales; el envío externo requiere aprobación humana | [Contratos](../reference/assumed-contracts.md), [runtime](../how-to/application-runtime.md) |
| Componente determinístico | HiGHS, reglas de elegibilidad, restricciones de transporte y verificación de credenciales | [Arquitectura](../reference/agents/architecture.md) |
| Humano en el ciclo | Candidato, orientador y empleador aprueban decisiones críticas | [Puntos de aprobación](../reference/agents/architecture.md#approval-boundaries) |
| Explicabilidad | Cada perfil, brecha, aptitud y restricción conserva evidencia y estado | [Glosario](../reference/employability-glossary.md) |
| Trazabilidad | Envelopes, spans de Langfuse y auditoría append-only | [Arquitectura](../reference/agents/architecture.md) |
| Evals propios | 19 casos documentados; credenciales: matriz `15/15`, precisión y recall `1` | [README raíz](../../README.md#evals), tests enlazados allí |
| Guardrails | Bloqueo de prompt injection, PII, promesas, datos inventados y acciones no autorizadas | [Evals LLM](../reference/frontend/testing.md#llm-behavioral-eval-set-r8), `guardrails.test.ts` |

## Alcance implementado y límites

### Implementado y demostrable

- Extracción de perfiles y experiencia informal.
- Normalización de vacantes y habilidades.
- Matching con restricciones de aptitud, horario, salario y transporte.
- Ruta de formación basada en brechas.
- Verificación de credenciales con fallback controlado.
- Borrador de postulación con aprobación del candidato.
- Rechazo de acciones no autorizadas y registro de decisiones.

### No presentado como implementado

- El auditor de sesgo independiente.
- El agente de entrevista simulada.
- Integraciones reales de WhatsApp, notas de voz y envío automático de mensajes.

Estos límites se declaran para evitar que la demo prometa capacidades que no están en el tag de congelamiento.

## Fuentes y datos

La demo usa fixtures y catálogo local para ser reproducible. Antes de la entrega final, esta tabla debe registrar las fuentes externas consultadas para sustentar el problema panameño:

| Dato | Fuente | Fecha de consulta | Uso |
|---|---|---|---|
| Desempleo juvenil | Pendiente de completar con fuente oficial panameña | — | Justificación del problema |
| Transporte y tiempos de traslado | Pendiente de completar | — | Restricción de matching |
| Cursos y cupos | Pendiente de completar con INADEH u otra fuente verificable | — | Ruta de formación |
| Vacantes | Catálogo/fixtures documentados en el repositorio | — | Demo y evals |

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
