# Build the Mi perfil view with editable preferences and data deletion

**Issue:** #47

**Owner:** MateoDG2006
**Parent spec:** #32
**Labels:** `ready-for-agent`
**Metadata**

- Project: none
- Milestone: none
- Fields: `work_type` = Ticket; `repo_scope` = web; `phase` = build; `priority` = medium; `risk` = medium; `sprint` = hackathon  ; `release_train` = none
- Todo: none
**Docs:** [Screen S7](https://github.com/HackathonFISC/equipo-02/blob/docs/frontend-spec/docs/reference/frontend/screens.md#s7--mi-perfil-perfil) · [Errors and recovery](https://github.com/HackathonFISC/equipo-02/blob/docs/frontend-spec/docs/reference/frontend/ux-flows.md#errors-and-recovery)

## Context
G5. Reads profile and preferences from #39's endpoints and reuses `PreferencesForm` from #35.

## Acceptance Criteria
- [ ] `/perfil` shows detected skills (names only) and experiences (title, type label, relevance label) (AC-35).
- [ ] The preferences form shows the essentials (target roles, zone, modality, minimum salary, schedule) and a collapsed "Más opciones" with every other field (AC-33).
- [ ] "Guardar cambios" saves, re-runs exploration, and shows the toast "Actualizamos tus vacantes" (AC-34); validation errors from `details[]` appear under the matching field.
- [ ] "Actualizar con el chat" opens `/chat` in profile-only mode (AC-36).
- [ ] "Eliminar mis datos" uses the destructive variant and opens an `AlertDialog` that names what is deleted and that submitted applications are kept, with "Cancelar" focused by default (AC-37).
- [ ] Confirming calls `DELETE /api/candidate`, signs the user out, and returns to `/` (AC-38).
- [ ] Candidate "Cerrar sesión" is available here (AC-80).
- [ ] Copy is gender-neutral ("Me interesa tomar cursos", "Me interesa hacer pasantías").

## Validation
Component tests for the form and the dialog (keyboard only). e2e: edit salary → toast → list refreshes; delete → back at `/` with no data on reload.

## Blocked By
- #41 — Build the candidate shell and the Vacantes view with vacancy cards and the detail sheet
