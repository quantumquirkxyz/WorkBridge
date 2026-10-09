# Skill quality audit - 2026-09-20

## Resultado

El bundle esta estructuralmente sano, pero hay deuda editorial importante en varias skills.

- `validate-skills.mjs`: pass, 177 skills validadas, 0 warnings, 0 errors.
- `audit-semantics.mjs`: pass, 184 `SKILL.md`/skills detectadas, 327 Markdown files, 0 warnings, 0 errors.
- `skill-lab.mjs rules --json`: catalogo vacio, lo que indica que las reglas no estan siendo extraidas de forma util por el tooling actual.

## Hallazgos

1. No hay descripciones frontmatter demasiado cortas con umbral de menos de 8 palabras. Las descripciones son razonables como etiquetas de descubrimiento.
2. Hay 52 skills con cuerpo menor a 180 palabras. En la practica, muchas de ellas no dan suficiente guia para ejecutar la skill.
3. Hay 30 placeholders claros con solo `Proposito`, `Contenido sugerido` y `Estado`. Estos son los candidatos de mayor prioridad.
4. Hay 83 skills con menos de 300 palabras y 0 reglas explicitas. Algunas pueden estar bien como aliases o routers, pero muchas necesitan criterios operativos.
5. Hay 139 skills con metadatos genericos como `execute the core process defined in the skill body` o `Markdown artifact or structured result`. Esto no rompe validacion, pero reduce precision para descubrimiento, routing y mantenimiento.

## Placeholders de prioridad alta

Estas 30 skills tienen cuerpo minimo y 0 reglas explicitas:

- `accessibility/accessibility-design`
- `backend/backend-caching`
- `backend/backend-queues`
- `cms/cms-access-control`
- `cms/cms-content-strategy`
- `compilers/compiler-design`
- `compilers/compiler-testing`
- `cs/cs-complexity-analysis`
- `cs/cs-computability`
- `cs/cs-data-structures`
- `db/db-migrations`
- `db/db-query-optimization`
- `docs/docs-knowledge-base`
- `docs/docs-technical-writing`
- `networking/networking-protocols`
- `networking/networking-security`
- `os/os-memory`
- `os/os-processes`
- `professional/professional-communication`
- `professional/professional-project-management`
- `qa/qa-manual-testing`
- `qa/qa-security-testing`
- `research/research-data-archiving`
- `research/research-literature-review`
- `se/se-performance`
- `se/se-system-design`
- `ux/ux-accessibility`
- `ux/ux-prototyping`
- `xr/xr-interaction-design`
- `xr/xr-performance`

## Plan de refuerzo

### Fase 1: definir estandar minimo

Agregar una guia comun para skills reforzadas:

- `Use when`: disparadores concretos y anti-disparadores.
- `Contract`: input, output, scope, boundary, side effects.
- `Rules`: 4 a 8 reglas accionables, no frases genericas.
- `Steps`: 4 a 7 pasos ejecutables.
- `Completion criteria`: 3 a 6 checks verificables.
- `References`: solo si hay archivos o skills realmente usados.

El objetivo practico es que una skill normal tenga al menos 220-350 palabras de guia real, salvo aliases deliberados.

### Fase 2: corregir los 30 placeholders

Actualizar primero los placeholders porque son el mayor hueco de comportamiento. Para cada una:

- conservar nombre, categoria y descripcion si ya son buenas;
- reemplazar `Contenido sugerido` por contrato, reglas, pasos y criterios;
- cambiar capabilities genericas por capacidades especificas del dominio;
- ajustar `outputs` para nombrar el artefacto real esperado.

### Fase 3: revisar skills cortas no-placeholder

Revisar las 22 skills restantes con cuerpo menor a 180 palabras. Separarlas en:

- aliases legitimos, como `grill`, que pueden ser breves pero deben declarar claramente delegacion y limites;
- routers/handoff, que necesitan reglas de seleccion y stop condition;
- skills de dominio, que deben pasar al mismo estandar minimo de la fase 1.

### Fase 4: limpiar metadatos genericos

Reemplazar metadatos genericos en las 139 skills afectadas cuando aporten poca informacion:

- `capabilities`: verbos especificos del dominio;
- `outputs`: nombres concretos de artefactos;
- `stopCondition`: criterio observable;
- `dependencies`: skills o tooling real si aplica.

### Fase 5: hacer medible la calidad

Actualizar o complementar el tooling para que falle o advierta sobre:

- cuerpos demasiado cortos, excepto aliases permitidos;
- placeholders con `Contenido sugerido`;
- `capabilities` genericas;
- ausencia de reglas o criterios de finalizacion;
- `skill-lab.mjs rules --json` devolviendo catalogo vacio cuando hay reglas parseables.

## Orden recomendado

1. Reforzar las 30 placeholders.
2. Reforzar aliases/routers cortos con limites claros.
3. Normalizar metadata generica por categoria.
4. Mejorar validator/auditor para prevenir regresion.
5. Ejecutar `validate-skills.mjs`, `audit-semantics.mjs` y el catalogo de reglas despues de cada lote.

