# Skills — Índice Plano

> Índice de entrada para aliases planos | 189 skills canónicas

---

| Recurso | Uso |
|---|---|
| [`docs/agents/skill-inventory.md`](../../docs/reference/agents/skill-inventory.md) | Inventario por skill con estado de lockfile, compatibilidad y descripción |
| [`docs/agents/skills-map.md`](../../docs/reference/agents/skills-map.md) | Mapa conceptual de flujos, gobierno, plataforma y especializaciones |
| [`skills-lock.json`](../../skills-lock.json) | Lista canónica de nombres y hashes actuales |
| [`.claude/skills/`](../../.claude/skills/) | Vista de compatibilidad mediante symlinks planos por nombre de skill |

## Invocación

- Use el nombre de la skill, por ejemplo `ask-to`, `to-spec`, `implement`, `review-pr` o `setup-quirk-skills`.
- La fuente canónica vive bajo `.agents/skills/<categoria>/<skill>/SKILL.md`.
- La vista plana `.claude/skills/<skill>` es un symlink de compatibilidad y no debe editarse directamente.
- Ejecute `node .agents/skills/platform/check-all.mjs` después de cambios en skills, rutas, docs de inventario o lockfile.

---

*Actualizado junto con el bundle; no lo use como reemplazo del inventario generado.*
