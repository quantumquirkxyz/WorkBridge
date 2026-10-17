# Casos de uso en el navegador

La suite visual recorre la interfaz actual contra Next en `http://127.0.0.1:4372`. El servidor de esa suite arranca con `PUENTE_PERSISTENCE=memory` y sin `OPENROUTER_API_KEY` ni `DATABASE_URL`, así que el intake usa el extractor heurístico y la exploración lee el catálogo en caché. El puerto **3001** sigue siendo el de `npm run dev`. El runtime de postulación sigue en **4371**, en el proyecto `runtime`.

Las capturas de página completa quedan en `test-results/e2e-web/`. Son salida de prueba y no se commitean. El reporte HTML de Playwright adjunta la captura de cada test.

## Comandos

Instala Chromium solo si el binario no está presente:

```bash
npx playwright install chromium
```

Interfaz (UC-01 a UC-06):

```bash
npm run test:e2e:web
```

Postulación (UC-07 a UC-09), sin reescribir esos tests:

```bash
npm run test:e2e -- --project=runtime
```

Ambos proyectos:

```bash
npm run test:e2e
```

Abre el reporte y las capturas:

```bash
npx playwright show-report
```

## Casos de la interfaz

| Id | Caso | Captura |
|---|---|---|
| UC-01 | Pegar un CV y obtener perfil, habilidades y experiencias | [UC-01.png](../../test-results/e2e-web/UC-01.png) |
| UC-02 | Texto vacío: error visible, sin perfil | [UC-02.png](../../test-results/e2e-web/UC-02.png) |
| UC-03 | Guardar preferencias y ver vacantes del catálogo | [UC-03.png](../../test-results/e2e-web/UC-03.png) |
| UC-04 | Sin vacante viable: causas en español y, si el candidato acepta formarse, la ruta | [UC-04.png](../../test-results/e2e-web/UC-04.png) |
| UC-05 | Guardar la búsqueda y verla en la lista | [UC-05.png](../../test-results/e2e-web/UC-05.png) |
| UC-06 | Eliminar los datos del candidato | [UC-06.png](../../test-results/e2e-web/UC-06.png) |

## Evidencia que esta suite no reescribe

| Id | Qué cubre | Dónde está |
|---|---|---|
| UC-07 | Borrador, corrección, aprobación, reintento y envío | [submission.spec.ts](../../apps/agent-runtime/e2e/submission.spec.ts) |
| UC-08 | Rechazo por candidato, orientador y empleador | [submission.spec.ts](../../apps/agent-runtime/e2e/submission.spec.ts) |
| UC-09 | El orientador desbloquea un envío | [submission.spec.ts](../../apps/agent-runtime/e2e/submission.spec.ts) |
| UC-10 | Los cuatro agentes corren en orden en el grafo | [graph.test.ts](../../apps/agent-runtime/src/workflow/__tests__/graph.test.ts) |

La verificación, los guardrails y el fallback siguen en sus tests unitarios:

- [ground-truth.test.ts](../../apps/agent-runtime/test/ground-truth.test.ts)
- [guardrails.test.ts](../../apps/agent-runtime/src/workflow/__tests__/guardrails.test.ts)
- [fallback.test.ts](../../apps/agent-runtime/test/fallback.test.ts)
