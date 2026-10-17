# Build the counselor review surface

**Issue:** #43

**Owner:** MateoDG2006
**Parent spec:** #32
**Labels:** `ready-for-agent`
**Metadata**

- Project: none
- Milestone: none
- Fields: `work_type` = Ticket; `repo_scope` = web; `phase` = build; `priority` = medium; `risk` = high; `sprint` = hackathon  ; `release_train` = none
- Todo: none
**Docs:** [Screen S11](https://github.com/HackathonFISC/equipo-02/blob/docs/frontend-spec/docs/reference/frontend/screens.md#s11--orientador-orientador-orientadordraftid) · [Application lifecycle](https://github.com/HackathonFISC/equipo-02/blob/docs/frontend-spec/docs/reference/frontend/ux-flows.md#application-lifecycle-j7j9) · [Gate reasons](https://github.com/HackathonFISC/equipo-02/blob/docs/frontend-spec/docs/reference/frontend/ux-flows.md#gate-reasons-in-plain-spanish)

## Context
G8. Counselors review drafts that hit a counselor gate (critical gap, unverified credential, bias alert, infeasible transport) per ADR-0003 and `counselorGateReasons`.

## Acceptance Criteria
- [ ] `/orientador` lists drafts with at least one gate reason and no counselor decision, newest first, with candidate display name, vacancy title, and gate reason labels (AC-66).
- [ ] `/orientador/[draftId]` shows the adapted documents in tabs, the evidence with verification badges (Verificada, Declarada, Sin verificar, Rechazada — icon + text), and the gate reasons (AC-67).
- [ ] Approve and reject both require a reason of at least 10 characters and call the runtime through the BFF (AC-68).
- [ ] A "Historial" timeline shows corrections, approvals, rejections, and submission with role, time, and reason — no trace ids (AC-69, NG4).
- [ ] The queue renders as cards and the detail full-screen at 360 px (AC-53); the empty state reads "No hay postulaciones esperando tu revisión 🎉".

## Validation
e2e as the seeded counselor: approve one gated draft and reject another with a reason; a candidate session gets redirected away from `/orientador`; axe and mobile helpers pass.

## Blocked By
- #40 — Add application read endpoints, employer organizations, and the web BFF to the application runtime
