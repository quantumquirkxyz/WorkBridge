# Screens

Produced with the `frontend-design` skill. Each screen lists purpose, layout (phone and desktop),
content, components ([design-system.md](design-system.md)), and states ([ux-flows.md](ux-flows.md#state-matrix)).
Breakpoint: `md` = 768 px. Wireframes are structural, not visual.

## Primary path and observable seam

What the user sees first is **one action** ("Empezar"); the first observable result is the chat's
summary bubble after `POST /api/intake`; the decisive screen is `/vacantes`. Everything else is
support for returning visits.

---

## S1 — Bienvenida (`/`)

**Purpose:** set tone and start J1. Shown to users with no stored session; users with a session
are redirected to `/vacantes`.

```
Phone                                   Desktop (md+)
┌───────────────────────────┐           ┌──────────────────────────────────────────────┐
│ ◠ WorkBridge          │           │ ◠ WorkBridge                             │
│                           │           │ ┌──────────────────────┐  ┌───────────────┐  │
│   [ilustración]           │           │ │ Tu experiencia       │  │ [ilustración] │  │
│                           │           │ │ cuenta. Aunque sea   │  │               │  │
│ Tu experiencia cuenta.    │           │ │ informal.            │  │               │  │
│ Aunque sea informal.      │           │ │ Cuéntanos qué sabes  │  │               │  │
│                           │           │ │ hacer y te mostramos │  │               │  │
│ Cuéntanos qué sabes hacer │           │ │ vacantes y cursos.   │  │               │  │
│ y te mostramos vacantes y │           │ │ [ Empezar → ]        │  │               │  │
│ cursos para ti.           │           │ └──────────────────────┘  └───────────────┘  │
│                           │           │  ✓ Gratis  ✓ 5 minutos  ✓ Tú decides        │
│ [      Empezar →       ]  │           └──────────────────────────────────────────────┘
│ ✓ Gratis ✓ 5 min ✓ Tú decides │
└───────────────────────────┘
```

- Copy: H1 "Tu experiencia cuenta. Aunque sea informal." · body "Cuéntanos qué sabes hacer y te
  mostramos vacantes y cursos para ti." · trust row "Gratis · 5 minutos · Tú decides qué compartir"
  · footer "Nunca enviamos una postulación sin tu permiso."
- Components: `Button` (primary, lg), `Illustration`, `TrustRow`.

## S2 — Chat (`/chat`)

**Purpose:** J1 profile + preference phases and J6 free conversation with the LLM assistant.
Full-height, no nav bar. The composer is always enabled for free questions except while a request
is in flight.

```
Phone                                    Desktop (md+): centered column max-w 640px
┌───────────────────────────┐
│ ←  WorkBridge      ●●●○○ 3/5  │  ← header: back, progress (phase steps)
├───────────────────────────┤
│ 🤖 ¿Has trabajado o       │
│    ayudado en algún lugar?│
│              Ayudo en la ▐│  ← user bubble (right, teal tint)
│              tienda de mi▐│
│              tía  Cambiar │
│ 🤖 ¡Genial! ¿Qué hacías   │
│    ahí?                   │
│ (Atender clientes) (Caja) │  ← QuickReplies, wrap, 44px min height
│ (Inventario) (Otra cosa)  │
├───────────────────────────┤
│ 📎 [ Escribe aquí…   ] 🎙 ➤│  ← Composer, sticky bottom, safe-area aware
└───────────────────────────┘
```

- Progress shows phase-level steps: Perfil, Preferencias, Resultados — computed from slot states,
  so it advances only when slots are `filled`, not with free conversation.
- Confirmation chips ("Sí" / "Cambiar") render under a bot bubble when the assistant proposed a
  value from free text (AC-47).
- Attachment preview: file chip with name, size, remove "×"; uploads with the intake call.
- Voice: tapping 🎙 shows a recording state ("Te escucho… toca para terminar") with a pulsing ring
  (reduced-motion: static ring); transcription fills the input for review.
- Components: `ChatHeader`, `MessageList`, `BotBubble`, `UserBubble`, `QuickReplies`,
  `TypingIndicator`, `Composer`, `AttachmentChip`, `VoiceButton`, `ProfileSummaryCard`.

## S3 — Vacantes (`/vacantes`)

**Purpose:** J2. Cards ordered by readiness; detail via `?v=`.

```
Phone                                   Desktop (md+)
┌───────────────────────────┐           ┌──────────────────────────────────────────────┐
│ Hola, Ana 👋              │           │ ◠ WorkBridge   Vacantes  Mi ruta  Mi perfil      │
│ 3 vacantes para ti        │           ├───────────────────────┬──────────────────────┤
│ Revisamos 24 · actualizado│           │ 3 vacantes para ti    │ Cajero/a — Super 99  │
│ hace 2 h                  │           │ ┌───────────────────┐ │ Preparación ████░ 80%│
│ ┌───────────────────────┐ │           │ │Cajero/a · Super 99│ │ ✓ Atención clientes  │
│ │Cajero/a               │ │           │ │███████████░░ 80%  │ │ ✓ Horario compatible │
│ │Super 99 · Presencial  │ │           │ │Te falta: Excel    │ │ ✗ Excel básico       │
│ │Panamá · USD 600–700   │ │           │ └───────────────────┘ │ ...                  │
│ │Preparación            │ │           │ ┌───────────────────┐ │ [Ver vacante original│
│ │███████████░░░░  80%   │ │           │ │ ...               │ │                      │
│ │Te falta: Excel básico │ │           │ └───────────────────┘ │                      │
│ │Publicada hace 1 día   │ │           │ Casi listas para ti   │                      │
│ └───────────────────────┘ │           │ ...                   │                      │
│ Casi listas para ti       │           └───────────────────────┴──────────────────────┘
│ ...                       │
│ 18 descartadas: horario(9)│
├───────────────────────────┤
│ 💼 🧭 📄 👤  (4 tabs)      │  ← BottomNav
└───────────────────────────┘
```

- Header: greeting (client-only name), count "N vacantes para ti", summary "Revisamos {considered}
  · actualizado hace {age}".
- `VacancyCard`: title, company, modality badge, location, salary (`USD min–max` or "Salario no
  publicado"), `ReadinessBar` ("Preparación", solver score; skeleton while loading), up to 2 "Te falta:" items, freshness text.
  Whole card is one link/button; min target 44 px.
- Section "Casi listas para ti" — `NearMatchCard`: same header + one sentence "Te bloquea:
  {constraint}" with icon, no readiness bar.
- Discard summary line (OQ-5): "{excluded} vacantes no encajan, sobre todo por: horario (9),
  salario (5)."
- Saved searches: "Guardar esta búsqueda" button opens a small dialog with name field; list lives
  in Mi perfil.

## S4 — Detalle de vacante (sheet / panel)

```
┌───────────────────────────┐
│ ━━━  (grabber)         ×  │
│ Cajero/a                  │
│ Super 99 · Presencial     │
│ Panamá, Bethania          │
│ USD 600–700 / mes         │
│ ───────────────────────── │
│ Tu preparación            │
│ ███████████░░░░  80%      │
│ Lo que ya tienes          │
│  ✓ Atención al cliente    │
│  ✓ Horario compatible     │
│ Lo que te falta           │
│  ✗ Excel básico  → Ver curso│ ← links to /ruta item when available
│ ───────────────────────── │
│ Publicada hace 1 día      │
│ [ Ver vacante original ↗ ]│
│ [ Preparar mi postulación ]│ ← primary; sign-in first if anonymous
│ ( Guardar ) ( Compartir ) │
└───────────────────────────┘
```

- Phone: `Sheet` from bottom, 90 % height, drag/escape/× to close; desktop: `Sheet` side="right",
  480 px, list remains scrollable.
- Closing removes `?v=` and returns focus to the originating card.

## S5 — Vacantes vacío (no match)

```
┌───────────────────────────┐
│  [ilustración brújula]    │
│ Aún no encontramos una    │
│ vacante para ti           │
│ {noMatch.explanation}     │
│ Lo que más te bloqueó:    │
│  • Horario (6 vacantes)   │
│  • Salario (3 vacantes)   │
│ [   Ver mi ruta →   ]     │
│ ( Ajustar mis preferencias)│ → /perfil
└───────────────────────────┘
```

Near matches (if any) render below as in S3.

## S6 — Mi ruta (`/ruta`)

```
┌───────────────────────────┐
│ Tu ruta                   │
│ 3 pasos para acercarte a  │
│ Atención al cliente       │
│ ① Excel básico            │
│   INADEH · 20 h · Gratis  │
│   Cubre: Hojas de cálculo │
│   "Te ayuda porque…"      │
│ │                         │
│ ② Servicio al cliente     │
│   ...                     │
│ Todavía sin curso:        │
│  • Inglés conversacional  │
├───────────────────────────┤
│ 💼 🧭 📄 👤  (4 tabs)      │
└───────────────────────────┘
```

- `RoadmapStep` (numbered, vertical connector): title, provider, duration, cost ("Gratis" when 0),
  covered gaps as chips, `explanationEs` as body.
- Empty variants per [state matrix](ux-flows.md#state-matrix).

## S7 — Mi perfil (`/perfil`)

```
┌───────────────────────────┐
│ Mi perfil                 │
│ ┌ Lo que sabes hacer ────┐│
│ │(Atención clientes)(Caja)││ ← skill chips
│ │Experiencias            ││
│ │• Tienda familiar ·     ││
│ │  Negocio familiar ·    ││
│ │  Relevante             ││
│ │[ Actualizar con el chat ]│
│ └────────────────────────┘│
│ ┌ Lo que buscas ─────────┐│
│ │Puestos   [Atención…  ] ││
│ │Zona      [Panamá ▾]    ││
│ │Modalidad (Pres)(Híb)(Casa)│
│ │Salario   [USD 600]     ││
│ │Horario   [L–V de día ▾]││
│ │▸ Más opciones          ││ ← Collapsible: días, horas, contrato,
│ │[  Guardar cambios  ]   ││   transporte, traslado, presupuesto, pasantía
│ └────────────────────────┘│
│ ┌ Búsquedas guardadas ───┐│
│ │• Atención en Panamá · 2 nuevas│
│ └────────────────────────┘│
│ ┌ Tus datos ─────────────┐│
│ │[ Eliminar mis datos ]  ││ ← destructive variant
│ └────────────────────────┘│
└───────────────────────────┘
```

- Desktop: two columns (profile left, preferences right); data section full width below.
- Delete dialog: title "¿Eliminar todos tus datos?" · body "Vamos a borrar tu perfil, tus
  preferencias y tus búsquedas guardadas. No se puede deshacer. Las postulaciones que ya enviaste
  se conservan como registro." · actions "Cancelar" (default
  focus), "Sí, eliminar" (destructive).

## S8 — Ingresar (`/ingresar`)

**Purpose:** J10. Better Auth sign-in / sign-up, reached directly or from an action that needs an
account (`?next=` keeps the destination).

```
┌───────────────────────────┐
│ ◠ WorkBridge          │
│ Guarda tu avance          │
│ Crea tu cuenta para       │
│ postular y volver cuando  │
│ quieras.                  │
│ [ Continuar con Google ]  │  ← OQ-3: Google + magic link
│ ─────── o ───────         │
│ Correo  [              ]  │
│ [   Enviarme un enlace  ] │
│ ¿Eres orientador/a o      │
│ empresa? Ingresa aquí →   │
└───────────────────────────┘
```

- An anonymous candidate keeps profile, preferences, and transcript after creating the account
  (AC-79).

## S9 — Postulación (`/postulaciones/[id]`)

**Purpose:** J7. Review the adapted application, correct it, approve, and send.

```
Phone                                   Desktop (md+): documents left (tabs), actions panel right
┌───────────────────────────┐
│ ← Cajero/a · Super 99     │
│ Estado: Borrador          │  ← StatusBadge + ApplicationTimeline (collapsed)
│ [ CV ] [ Carta ] [Evidencia]│ ← Tabs
│ ┌───────────────────────┐ │
│ │ Ana Pérez             │ │
│ │ Atención al cliente…  │ │  ← editable document (textarea, autosize)
│ └───────────────────────┘ │
│ ⚠ Necesita revisión de tu │  ← only when counselorGate ≠ ∅
│   orientador/a:           │
│   • Una de tus certific…  │
├───────────────────────────┤
│ ( Rechazar ) [ Aprobar ]  │  ← sticky ActionBar, safe-area aware
└───────────────────────────┘
```

- Evidence tab: each item is a checkbox card (title, type, verification state badge); unchecking
  sends a correction. Only declared evidence is listed (AC-57).
- After approval the primary action becomes "Enviar postulación" (enabled per AC-59) and, once
  sent, the bar is replaced by "Enviada el {fecha}".
- Gate copy per [ux-flows.md § Gate reasons](ux-flows.md#gate-reasons-in-plain-spanish).
- Reject opens a dialog with a required reason field.

## S10 — Postulaciones (`/postulaciones`)

```
┌───────────────────────────┐
│ Mis postulaciones         │
│ ┌───────────────────────┐ │
│ │Cajero/a · Super 99    │ │
│ │● Lista para enviar    │ │  ← StatusBadge (icon + text)
│ │Actualizada hace 2 h  ›│ │
│ └───────────────────────┘ │
│ ┌───────────────────────┐ │
│ │Soporte · Cable Onda   │ │
│ │◐ En revisión del      │ │
│ │  orientador           │ │
│ └───────────────────────┘ │
├───────────────────────────┤
│ 💼 🧭 📄 👤  (4 tabs)      │
└───────────────────────────┘
```

## S11 — Orientador (`/orientador`, `/orientador/[draftId]`)

**Purpose:** J8. Desktop-first, usable at 360 px (AC-53).

```
Desktop                                              Phone: queue as cards; detail full screen
┌───────────────────────────────────────────────────────────────┐
│ ◠ WorkBridge · Orientación          Pendientes (4)   Historial  ⏻ │
├──────────────────────────┬────────────────────────────────────┤
│ Pendientes de revisión   │ Ana P. → Cajero/a · Super 99        │
│ ▸ Ana P. · Cajero/a      │ Motivos: [Brecha crítica]          │
│   Brecha crítica         │          [Credencial sin verificar]│
│ ▸ Luis G. · Soporte      │ [ CV ] [ Carta ] [ Evidencia ]     │
│   Transporte inviable    │ Evidencia                           │
│ ▸ …                      │ • Curso Excel — Sin verificar       │
│                          │ • Tienda familiar — Declarada       │
│                          │ Historial ───────────────           │
│                          │ Candidata aprobó · hace 1 h · "…"   │
│                          │ Motivo de tu decisión*              │
│                          │ [                               ]   │
│                          │ ( Rechazar )      [ Aprobar ]       │
└──────────────────────────┴────────────────────────────────────┘
```

- Candidate shown by display name and initial only in the list; the detail shows the documents
  the candidate approved.
- Verification state badges: Verificada (success), Declarada (neutral), Sin verificar (warning),
  Rechazada (danger) — icon + text.

## S12 — Empresa (`/empresa`, `/empresa/[submissionId]`)

**Purpose:** J9. Desktop-first, usable at 360 px.

```
┌───────────────────────────────────────────────────────────────┐
│ ◠ WorkBridge · Empresas        Postulaciones (3)                ⏻ │
├──────────────────────────┬────────────────────────────────────┤
│ Pendientes               │ Postulación a Cajero/a              │
│ ▸ Cajero/a · hace 1 día  │ [ CV ] [ Carta ]                    │
│ ▸ Cajero/a · hace 2 días │ Evidencia aprobada por la persona   │
│ ▸ Soporte · hace 3 días  │ • Atención al cliente (1 año)       │
│                          │ Motivo de tu decisión*              │
│                          │ [                               ]   │
│                          │ ( No avanza )  [ Pasar a entrevista ]│
└──────────────────────────┴────────────────────────────────────┘
```

- Shows only submitted documents and approved evidence; no age, gender, address, photo, or any
  protected attribute (AC-72, R12).

## S13 — Navigation

| Role | Phone (< md) | Desktop (md+) | Items |
|---|---|---|---|
| Candidate | `BottomNav`, 4 tabs, 64 px + safe area | `TopNav` | Vacantes (`Briefcase`), Mi ruta (`Compass`), Postulaciones (`FileText`), Mi perfil (`UserRound`) |
| Counselor | `TopNav` collapsed into a menu sheet | `TopNav` | Pendientes, Historial, Cerrar sesión |
| Employer | `TopNav` collapsed into a menu sheet | `TopNav` | Postulaciones, Cerrar sesión |

- Candidate navigation is hidden on `/`, `/chat`, and `/ingresar`.
- "Cerrar sesión" lives in Mi perfil for candidates and in the header menu for other roles (AC-80).
