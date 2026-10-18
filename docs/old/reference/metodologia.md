# Metodología de WorkBridge

Este documento describe cómo se despliega, opera y organiza WorkBridge. La
[arquitectura de agentes](agents/architecture.md) es el diagrama de referencia
para el flujo de agentes, sus herramientas, los planos de datos y ejecución, y
los puntos de aprobación humana.

## Arquitectura

WorkBridge es un monorepo TypeScript con un runtime de aplicación y un intake
web. El runtime coordina cuatro agentes mediante un workflow de Mastra, en este
orden:

1. **Exploration** interpreta las metas y preferencias del candidato.
2. **Profile and Evidence** normaliza el perfil, CV y credenciales declaradas.
3. **Market and Matching** lee vacantes y calcula el matching determinista con
   HiGHS y datos de rutas de Google Maps.
4. **Training** convierte las brechas resultantes en una hoja de ruta de
   formación.

Los perfiles, documentos de vacantes, decisiones de matching y hojas de ruta
pertenecen al plano de datos. Mastra, los trazos de Langfuse y el registro de
auditoría pertenecen al plano de ejecución. La verificación de credenciales
usa Certo con fallbacks de Accredible, Credly y un mock transparente; no es un
agente adicional.

La postulación está separada del workflow. Un agente no puede enviar una
postulación, avanzar una entrevista ni enviar mensajes. Antes de enviar un
borrador se requiere aprobación del candidato; los hallazgos críticos pueden
requerir aprobación del consejero y la progresión de entrevista requiere
aprobación del empleador.

## Requisitos y configuración

- Node.js 22 o superior.
- npm y Docker para el despliegue en contenedor.
- `DATABASE_URL` para persistencia PostgreSQL en producción. Sin una URL, el
  runtime usa memoria, apropiado solo para desarrollo o pruebas.
- `BETTER_AUTH_SECRET` para firmar roles de sesión.
- `OPENROUTER_API_KEY` es opcional para el intake; sin ella se usa el extractor
  heurístico determinista.

Para desarrollo local:

```bash
npm ci
cp .env.example .env
npm run dev       # intake web en http://localhost:3001
npm start         # runtime de postulaciones
```

No se deben guardar credenciales reales en Git. Los nombres y ejemplos de
variables se mantienen en `.env.example` y `apps/web/.env.example`.

## Despliegue con Docker

La imagen usa `node:22-alpine`, instala las dependencias del monorepo y expone
el puerto 3000. El healthcheck consulta `GET /health`.

```bash
docker build -t workbridge-application .
docker run --rm --env-file .env -p 3000:3000 workbridge-application
```

El contenedor inicia `apps/agent-runtime/src/application/main.ts`. Si no se
configura una base de datos, `GET /health` informa `databaseMode: "memory"` y
la persistencia es temporal. Para producción se debe proporcionar
`DATABASE_URL` mediante el entorno del proveedor, nunca dentro de la imagen.

## Despliegue en Vercel

`vercel.json` dirige todas las solicitudes a
`apps/agent-runtime/src/application/vercel.ts`, ejecutada como una función
Node.js de Vercel.

1. Importar el repositorio en Vercel.
2. Configurar las variables de entorno de producción, al menos
   `DATABASE_URL` y `BETTER_AUTH_SECRET`.
3. Añadir `OPENROUTER_API_KEY` y las credenciales de proveedores solo si se
   habilitan esas integraciones.
4. Desplegar y comprobar `GET /health`.

Si `DATABASE_URL` está vacío y existe `NEON_DATABASE_URL`, el runtime usa Neon
como respaldo SQL e informa `databaseMode: "neon-backup"` y
`persistence: "sql"`. La tabla de idempotencia es
`submission_idempotency`; sus claves evitan duplicar envíos. Las cadenas de
conexión y tokens permanecen en variables de entorno de Vercel.

## Operación del runtime

El runtime expone la aplicación de postulaciones con borradores protegidos por
roles. Para operar una instancia:

1. Revisar `GET /health` después del despliegue y confirmar el modo de base de
   datos esperado.
2. Ejecutar el workflow para producir un perfil normalizado, una decisión de
   matching y una hoja de ruta.
3. Revisar los eventos de auditoría y los trazos antes de aceptar un borrador.
4. Obtener la aprobación humana correspondiente y solo entonces procesar el
   envío.
5. Usar claves de idempotencia para reintentos; no repetir manualmente una
   solicitud cuyo resultado aún se está resolviendo.

Los detalles de endpoints, roles, borradores y envíos están en
[`application-runtime.md`](../how-to/application-runtime.md). Para validar una
instancia local se puede ejecutar:

```bash
npm run typecheck
npm test
npm run gate:ci
```

## Validación operativa

La validación mínima de una entrega es:

- leer esta metodología y comprobar que los comandos corresponden a
  `Dockerfile`, `vercel.json` y los scripts de `package.json`;
- abrir el [diagrama de arquitectura](agents/architecture.md);
- ejecutar `GET /health` en el entorno desplegado;
- confirmar que no se han expuesto secretos y que las aprobaciones humanas no
  fueron omitidas.
