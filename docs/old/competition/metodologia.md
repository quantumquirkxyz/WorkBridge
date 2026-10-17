# Documento de metodología

## Objetivo

WorkBridge conecta jóvenes, empresas y centros de formación mediante un flujo multiagente que convierte evidencia incompleta en decisiones de empleabilidad explicables y sujetas a aprobación humana.

## Funcionamiento

1. **Exploration** recoge objetivos y restricciones del candidato.
2. **Profile and Evidence** extrae habilidades, experiencia informal y credenciales.
3. **Market and Matching** normaliza la vacante y ejecuta el matching determinístico.
4. **Training** calcula una ruta de formación para las brechas restantes.
5. El sistema genera un borrador de postulación y espera la aprobación del candidato.
6. Orientador y empleador intervienen cuando existen brechas críticas, evidencia no verificada, alertas de sesgo o progresión de entrevista.

## Arquitectura

La fuente de verdad es el [diagrama de arquitectura](../reference/agents/architecture.md). Mastra coordina el grafo; PostgreSQL/Prisma conserva datos; HiGHS resuelve el matching; Google Maps calcula rutas; Langfuse y el audit log conservan trazabilidad.

Los modelos no deciden por sí solos restricciones duras. Las decisiones de aptitud, transporte, horario, salario y verificación se calculan mediante código y contratos validados.

## Despliegue y ejecución

```bash
npm ci
cp apps/web/.env.example apps/web/.env.local
npm test
npm run typecheck
npm run gate:ci
npm run test:e2e
npm run dev
```

La demo local funciona sin claves de modelo mediante el extractor heurístico y fixtures deterministas. Las credenciales se configuran únicamente mediante `.env`; nunca se incluyen claves reales en el repositorio.

## Validación

- Unit tests: contratos, matching, credenciales, guardrails y fallbacks.
- E2E: perfil, vacantes, ruta de formación, borradores y aprobaciones.
- Evals adversariales: inyección, PII, promesas, datos inexistentes y solicitudes fuera de alcance.
- Evals de ground truth: 15 estados de credenciales con matriz de confusión.

El resultado oficial debe conservarse asociado al commit del tag `final-24h`.

## Seguridad y límites

Los agentes no pueden enviar postulaciones, mensajes ni avanzar entrevistas sin los gates humanos correspondientes. Los datos personales se minimizan y las credenciales permanecen fuera de los artefactos de demo.
