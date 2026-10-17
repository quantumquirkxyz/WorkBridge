# WorkBridge Web: candidate, counselor, and employer experience

Spec produced with the `to-spec` skill from the 2026-10-16 design conversation. Shape follows
`.agents/skills/project/to-spec/references/spec-template.md`; criteria were run against
`spec-checklist.md` (see [Validation notes](#validation-notes)). Parent spec:
`.agents/skills/platform/artifacts/to-spec/workbridge-quantumquirkxyz.md` (#3); approval rules
come from ticket 09 and ADR-0003.

## Problem

A young person in Panama with little or informal experience opens `apps/web` and meets one long
technical page: a source selector, a 15-field preferences form, and result tables with internal
vocabulary. The profile they submit does not feed the vacancy search, the aptitude classification
is never shown, the tables are unusable on a phone, and there is no way to sign in, prepare an
application, or involve the counselor and employer that ADR-0003 requires. The application
lifecycle already exists in `apps/agent-runtime` (`ApplicationService`: drafts, corrections,
approvals, submission, interview decision, audit) but has no interface.

## Solution (user's perspective)

**Candidate (mobile first)**
1. **Conversation, not a form.** A friendly AI assistant (LLM) talks with me in plain Spanish. It
   leads with the questions that fill in what is still missing or incomplete about me, offering
   quick-reply chips, but I can also write freely — ask what a job involves, why something is
   asked, or what a course is about — and it answers before steering back. I can attach my CV as a
   PDF or photo, or speak instead of typing.
2. **Only what is missing.** After reading my profile, the same chat asks only the job preferences
   it could not infer, confirms each one with me, then shows my results.
3. **Clear results.** Vacancy cards ordered by how ready I am, each with a "Preparación" bar and
   what I am missing. Tapping a card opens the details.
4. **A path when nothing fits.** If no vacancy is viable, I see why and a training route.
5. **Apply with control.** From a vacancy I can prepare an application: the system drafts an
   adapted CV and cover letter using only my evidence; I review, correct, approve, and send it. If
   my case needs a counselor's review, I see why and that it is pending.
6. **My account.** I sign in with Better Auth, and my profile, searches, and applications are there
   when I return, on my phone or a computer.

**Counselor (orientador/a)** — sees a queue of applications that need their review (critical gap,
unverified credential, bias alert, infeasible transport), reads the draft and evidence, and
approves or rejects with a reason.

**Employer (empresa)** — sees applications submitted to their vacancies and decides, with a reason,
whether each candidate moves to an interview.

## Goals

- G1 — A candidate completes profile capture through an LLM-guided chat.
- G2 — The captured profile feeds preference capture, exploration, and applications under one candidate identity.
- G3 — The candidate understands each vacancy's fit through a readiness bar and plain reasons.
- G4 — The candidate receives a training route when no vacancy is viable.
- G5 — The candidate can review, edit, and delete their profile, preferences, and searches.
- G6 — Every surface works as a mobile web interface (candidate designed mobile-first) and on desktop, is accessible (WCAG 2.2 AA), and supports light and dark themes.
- G7 — The candidate prepares, corrects, approves, and submits an application under the ADR-0003 rules.
- G8 — A counselor reviews and approves or rejects applications that hit a counselor gate.
- G9 — An employer decides interview progression for submitted applications.
- G10 — Users sign in through Better Auth and only see the surfaces and data their role allows.

## Non-Goals

- NG1 — The chat assistant takes no autonomous actions: it cannot submit or approve applications,
  save preferences the user has not confirmed, or decide aptitude. It converses, asks, and
  proposes; deterministic handlers and the user decide ([ADR-0006](../../../.agents/adr/0006-guided-chat-intake.md)).
- NG2 — No automatic or agent-initiated submission: an application is submitted only by an explicit
  candidate action after every required approval (ADR-0003); the web app never bypasses
  `ApplicationService` gates.
- NG3 — No employer vacancy publishing, candidate search, or messaging; the employer surface is
  limited to deciding interview progression for applications submitted to their organization's
  vacancies (OQ-10, decided 2026-10-16).
- NG4 — No internal technical metadata in candidate views: trace ids, extractor kind, confidence
  percentages, internal agent names, raw ids. Counselor and employer views show the audit history
  as actor role, time, and reason — not trace ids.
- NG5 — No hand-rolled authentication: sign-in, sessions, and roles come from Better Auth only;
  the web app never mints roles or session signatures in the browser.
- NG6 — No server-side audio processing; voice input is transcribed by the browser.
- NG7 — No native store apps (iOS/Android), no offline mode, and no push notifications in this
  spec; mobile is delivered as the installable mobile web interface of G6 (AC-83, OQ-9).
- NG8 — No admin console; `counselor` and `employer` accounts (and the employer's organization)
  are provisioned by a per-environment seed script (OQ-11, decided 2026-10-16).

## Acceptance Criteria

IDs are stable identifiers, not an order. AC-46+ were added in revisions.

### G1 — LLM-guided chat profile capture
- [ ] AC-01 Visiting `/` without a session shows a welcome screen with one primary action, "Empezar", that opens `/chat`.
- [ ] AC-02 Each assistant turn targets the highest-priority slot that is still `missing` or `incomplete`, following [ux-flows.md § Slot agenda](ux-flows.md#slot-agenda).
- [ ] AC-03 When the assistant asks a slot question with closed options, it offers quick-reply chips, and the free-text input stays enabled.
- [ ] AC-46 When the user writes a message that is not an answer to the pending slot, the assistant answers it in the same turn and then re-asks the pending slot; the slot state does not change.
- [ ] AC-47 A slot reaches `filled` only from a chip selection or from a user "Sí" to an explicit confirmation chip proposed by the assistant from free text.
- [ ] AC-48 Each `POST /api/chat` response carries `reply` (≤ 600 characters), `slotUpdates`, and `chips`, and validates against the `ChatTurn` JSON Schema; an invalid model response is retried once, then replaced by the deterministic fallback question for the pending slot.
- [ ] AC-49 With no `OPENROUTER_API_KEY`, `/chat` still completes J1 with the deterministic fallback questions, and free-text questions receive "Ahora mismo solo puedo ayudarte a completar tu perfil. ¿Seguimos?".
- [ ] AC-81 After 40 LLM turns in one candidate session, `/api/chat` answers only with fallback questions (`source: "fallback"`), and the first capped turn tells the user "Sigamos con lo importante para encontrarte vacantes." (OQ-8).
- [ ] AC-50 The assistant never states that the user got a job, was selected, or that an application was sent or approved; replies about specific vacancies, salaries, or courses use only the candidate's own profile, exploration, match decisions, and roadmap passed in the prompt context; general career guidance is allowed and introduced as general ("En general…") (OQ-7).
- [ ] AC-04 The attach control accepts one PDF (`application/pdf`) or one image (`image/*`) up to 10 MB; a larger file shows "Ese archivo pesa más de 10 MB. Prueba con otro." and is not sent.
- [ ] AC-05 In a browser exposing `SpeechRecognition` or `webkitSpeechRecognition`, the mic control transcribes speech (lang `es-PA`, fallback `es-419`) into the input for review before sending.
- [ ] AC-06 In a browser without speech recognition, the mic control is not rendered.
- [ ] AC-07 On finishing the profile phase, the client sends one `POST /api/intake` per captured source under the same candidate id, and the server merges each source into the existing profile: skills and experiences deduplicated by canonical id, evidence appended, no previously stored item removed (OQ-2: server merge).
- [ ] AC-08 While intake runs, the chat shows a typing indicator and "Estoy leyendo lo que me contaste…"; the composer is disabled.
- [ ] AC-09 After a 200 response, the assistant summarises the result as counts of skills and experiences, e.g. "Encontré 5 habilidades y 2 experiencias".
- [ ] AC-10 When `extraction.needs_review` is true, the summary adds "Algunos datos los vamos a confirmar contigo en Mi perfil." and no technical warning text is shown.
- [ ] AC-11 After a 4xx/5xx or network failure, the assistant shows a retry message with a "Reintentar" chip that resends the same payload; the transcript is preserved.
- [ ] AC-12 Reloading `/chat` mid-conversation restores the transcript and slot state.

### G2 — One candidate identity
- [ ] AC-13 The candidate id used for intake, preferences, exploration, searches, and drafts equals the Better Auth `user.id` (anonymous or linked) and is derived from the session on the server, never sent by the browser (OQ-3).
- [ ] AC-14 Target roles extracted into `profile.target_roles` start as `filled`; the chat does not ask for them, and they remain editable in Mi perfil.
- [ ] AC-15 The preference phase asks only the essential slots not already known ([ux-flows.md § Preference phase](ux-flows.md#preference-phase)); non-essential fields take the documented defaults.
- [ ] AC-16 After the last preference slot is confirmed, the client calls `POST /api/explore` once and navigates to `/vacantes`.

### G3 — Vacancy results
- [ ] AC-17 `/vacantes` lists one card per vacancy, ordered by readiness score descending.
- [ ] AC-18 Each card shows title, company (or "Empresa no indicada"), modality, location, salary range, freshness label, and a "Preparación N%" progress bar.
- [ ] AC-19 The readiness value is `MatchDecision.score` from `POST /api/match` (solver via `MatchingService`), and the "Te falta:" items come from the decision's failed constraints and score-breakdown reasons; while a decision loads the card shows a skeleton bar, never another score (OQ-1: solver).
- [ ] AC-20 Each card shows at most two "Te falta:" items; the detail view shows all of them.
- [ ] AC-21 Activating a card sets `?v=<jobId>` and opens the detail as a bottom sheet below 768 px viewport width and as a right side panel at 768 px and above.
- [ ] AC-22 Loading `/vacantes?v=<jobId>` directly opens that vacancy's detail.
- [ ] AC-23 The detail view links "Ver vacante original" to `provenance.sourceUrl` in a new tab with `rel="noreferrer"`.
- [ ] AC-24 Near matches render in a section "Casi listas para ti" with the blocking constraint stated as one sentence.
- [ ] AC-25 Excluded vacancies are not listed; one line states their count and the top three causes with counts, e.g. "18 vacantes no encajan, sobre todo por: horario (9), salario (5), traslado (4)." (OQ-5).
- [ ] AC-26 While exploration loads, `/vacantes` shows three skeleton cards.
- [ ] AC-82 When a saved search has matches that did not exist at the candidate's last visit, the "Vacantes" nav item shows a count badge (with an accessible label "N vacantes nuevas") and `/vacantes` shows a section "Nuevas desde tu última visita" above the list; opening `/vacantes` clears the badge (OQ-6).

### G4 — Training route
- [ ] AC-27 When `noMatch` is present, `/vacantes` shows "Aún no encontramos una vacante para ti" with `noMatch.explanation` and a primary action "Ver mi ruta" linking to `/ruta`.
- [ ] AC-28 `/ruta` lists recommendations as ordered steps with title, provider, covered gaps (labels), cost ("Gratis" when 0), and duration in hours.
- [ ] AC-29 When `willing_to_train` is false, `/ruta` shows an explanation and a toggle to enable it instead of an empty list.
- [ ] AC-30 Unresolved gaps render under "Todavía sin curso disponible" by label.

### G5 — Profile, preferences, and data control
- [ ] AC-31 After the first exploration, candidate navigation with "Vacantes", "Mi ruta", "Postulaciones", "Mi perfil" is visible on every candidate route except `/` and `/chat`; it is a bottom bar below 768 px and a header bar at 768 px and above.
- [ ] AC-32 The active section has `aria-current="page"` and a non-color indicator.
- [ ] AC-33 `/perfil` shows the essentials (target roles, zone, modality, minimum salary, schedule) and a collapsed "Más opciones" section with every other preference field.
- [ ] AC-34 Saving in `/perfil` calls `POST /api/explore` and shows the toast "Actualizamos tus vacantes".
- [ ] AC-35 `/perfil` lists detected skills (names only) and experiences (title, type label, relevance label).
- [ ] AC-36 "Actualizar con el chat" in `/perfil` reopens `/chat` with the profile phase only.
- [ ] AC-37 "Eliminar mis datos" uses the destructive button variant and opens a confirmation dialog naming what will be deleted.
- [ ] AC-38 Confirming deletion removes the profile, preferences, and saved searches on the server, signs the user out, and returns to `/`; submitted applications are kept as audit records and the dialog says so.

### G6 — Mobile web, accessibility, theming
- [ ] AC-42 No route produces horizontal scroll at 360 px viewport width.
- [ ] AC-51 Every candidate flow (J1–J7) is completable on a 360 × 640 viewport with touch only, and every touch target is at least 44 × 44 CSS px.
- [ ] AC-52 Fixed bottom elements (nav bar, chat composer, sheet actions) respect `env(safe-area-inset-bottom)` and stay visible above the on-screen keyboard on iOS Safari and Android Chrome.
- [ ] AC-53 Counselor and employer surfaces are fully usable at 360 px width (lists become cards; detail opens full screen).
- [ ] AC-83 The app serves a web app manifest (name "WorkBridge", `display: standalone`, theme color, 192 px and 512 px icons, maskable icon) so it can be added to the home screen; no service worker caching and no push notifications are included (OQ-9).
- [ ] AC-54 Playwright e2e runs every journey on a mobile profile (Pixel 7, iPhone 14) and on desktop Chromium.
- [ ] AC-40 Every route passes an axe scan with zero serious or critical violations in light and dark themes.
- [ ] AC-41 Every interactive flow is completable with keyboard only.
- [ ] AC-43 The theme follows `prefers-color-scheme`.
- [ ] AC-44 No candidate-view text contains `trace`, `extractor`, `CandidateProfile`, `confidence`, or a raw id (NG4).
- [ ] AC-45 Text and interactive elements meet the contrast ratios in [design-system.md § Contrast](design-system.md#contrast) in both themes.

### G7 — Candidate application
- [ ] AC-55 The vacancy detail shows "Preparar mi postulación"; activating it without a signed-in account opens sign-in and returns to the same vacancy afterwards.
- [ ] AC-56 "Preparar mi postulación" creates a draft through `POST /drafts` and opens `/postulaciones/<draftId>` showing the adapted CV, the cover letter, and the evidence used.
- [ ] AC-57 The draft view lets the candidate deselect evidence items and edit text; corrections are sent through `/drafts/<id>/corrections`, and an evidence item not declared by the candidate cannot be added.
- [ ] AC-58 After any correction, previous approvals are shown as cleared, matching `ApplicationService.correctDraft`.
- [ ] AC-59 "Aprobar mi postulación" records the candidate approval; "Enviar postulación" stays disabled until every required approval covers the selected evidence.
- [ ] AC-60 When the draft hits a counselor gate, the draft view shows "Necesita revisión de tu orientador/a" and each gate reason in plain Spanish (copy in [screens.md § S9](screens.md#s9--postulación-postulacionesid)).
- [ ] AC-61 "Enviar postulación" sends exactly one submission per draft using an idempotency key; a repeated tap or retry does not create a second submission.
- [ ] AC-62 `/postulaciones` lists every draft and submission with exactly one status derived by the table in [ux-flows.md § Application status](ux-flows.md#application-status): Borrador, En revisión del orientador, Lista para enviar, Enviada, Entrevista aprobada, No avanzó, Rechazada.
- [ ] AC-63 A rejected draft shows the rejecting role and reason and no send action.
- [ ] AC-64 "Rechazar" in the draft view requires a reason before it can be confirmed.

### G8 — Counselor surface
- [ ] AC-65 A user with role `counselor` lands on `/orientador` after sign-in and cannot open candidate-only or employer routes (redirect to `/orientador`).
- [ ] AC-66 `/orientador` lists drafts with at least one gate reason and no counselor decision, newest first, each showing candidate display name, vacancy title, and gate reason labels.
- [ ] AC-67 The counselor draft view shows the adapted documents, the evidence with its verification state (Verificada, Declarada, Sin verificar, Rechazada), and the gate reasons.
- [ ] AC-68 The counselor can approve or reject; both require a reason of at least 10 characters and record actor, role, time, and reason (shown in the history).
- [ ] AC-69 Each draft view shows a "Historial" timeline of corrections, approvals, rejections, and submission with role, time, and reason.

### G9 — Employer surface
- [ ] AC-70 A user with role `employer` lands on `/empresa` after sign-in and cannot open candidate or counselor routes (redirect to `/empresa`).
- [ ] AC-71 `/empresa` lists only submissions with interview status "Pendiente" whose vacancy belongs to the employer's organization (`vacancy.employerOrgId = user.employerOrgId`); a submission for another organization's vacancy returns 403 (OQ-10).
- [ ] AC-72 The employer submission view shows only the submitted documents and approved evidence; no protected attributes and no rejected or deselected evidence.
- [ ] AC-73 The employer can approve or reject interview progression; both require a reason and record actor, role, time, and reason.
- [ ] AC-74 After an employer decision, the candidate's `/postulaciones` status changes to "Entrevista aprobada" or "No avanzó" on next load.

### G10 — Authentication and roles (Better Auth)
- [ ] AC-75 `/ingresar` offers exactly two methods: "Continuar con Google" and an email magic link (OQ-3).
- [ ] AC-76 The session is read on the server; every role-specific route group checks `session.user.role` in its server layout before rendering.
- [ ] AC-77 Requests from `apps/web` to `apps/agent-runtime` carry the signed Better Auth session produced on the server (`signBetterAuthSession`); the signing secret never reaches the browser.
- [ ] AC-78 A candidate's profile, preferences, searches, and drafts are only readable with that candidate's session (403 otherwise).
- [ ] AC-79 `/chat`, `/vacantes`, and `/ruta` work with a Better Auth anonymous session; "Guardar búsqueda" and "Preparar mi postulación" require linking an account, and after linking the profile, preferences, searches, and transcript are still present under the same candidate (OQ-3).
- [ ] AC-80 "Cerrar sesión" is reachable from every role's navigation and returns to `/`.

## Seams and testing decisions

- **Primary seam: web API routes** (`/api/*` in `apps/web`). Candidate UI is tested against them,
  mocked with MSW for component/integration tests, real in Playwright e2e. The data plane stays
  in the packages; the redesign lives on the execution-plane side of this existing seam.
- **Conversation seam: `POST /api/chat`** — pure `handleChatTurn` handler: transcript + slot state
  in, `ChatTurn` out. It calls `ChatFn` (`createOpenRouterChat`, JSON-schema output) and falls back
  to deterministic slot questions. Tests inject a fake `ChatFn`.
- **Application seam: web BFF → `apps/agent-runtime` application server** (`/drafts`,
  `/drafts/:id/{corrections,approvals,rejections,submissions}`, `/submissions/:id/{approvals,interview}`,
  `/audit`). `apps/web` route handlers under `/api/applications/*` read the Better Auth session,
  sign it server-side, and forward. This is the parent spec's "internal REST between `apps/web`
  and `apps/agent-runtime`" seam; gates stay in `ApplicationService`, never in the UI.
- **Session seam: Better Auth** (`/api/auth/[...all]`), read in server layouts per role group.
- **UI seam: `useCandidateSession`** — one hook owning the candidate's profile, preferences, and
  latest exploration; component tests mock it.
- **Server additions required:** `POST /api/chat`, `GET /api/profile`, `GET /api/preferences`,
  `DELETE /api/candidate` (CS-7), `/api/applications/*` BFF, `/api/auth/[...all]`, durable stores
  for preferences/searches (R5). `POST /api/match` or equivalent is required because drafts need a
  domain `MatchDecision`, and the readiness bar uses the same endpoint (OQ-1).
- **Runtime additions required (read side):** the application server exposes only writes and
  `/audit` today. The UI needs `GET /drafts?candidateId=` (candidate list), `GET /drafts/:id`
  (draft view), `GET /drafts?gate=counselor&pending=true` (counselor queue), and
  `GET /submissions?interview=pending_employer_approval` (employer queue, filtered by the
  session's `employerOrgId`), each enforcing role and ownership in `ApplicationService`. Vacancies
  gain an `employerOrgId`, and the runtime `BetterAuthSession.user` gains `employerOrgId` for employers.

## Decisions

- D1 — LLM-guided conversation with a deterministic slot agenda. The LLM drives the dialogue,
  answers free questions, and proposes slot values; a deterministic slot tracker decides
  completeness and the user confirms every value. Rejected: a scripted chat without LLM (cannot
  answer free questions — user correction 2026-10-16); an unconstrained LLM agent (cannot
  guarantee completeness or the `candidate_explicit` origin of preferences); a form. ADR-0006.
- D2 — Tailwind v4 + shadcn/ui on Radix. Rejected: plain CSS (CS-1 drift); MUI/Chakra (runtime
  CSS-in-JS, heavier theming). ADR-0007.
- D3 — URL holds shareable state (`?v=jobId`, `/postulaciones/<id>`); candidate state lives in
  `useCandidateSession` backed by server reads under the Better Auth session. Rejected: a global
  client store (Zustand) — the graph is one candidate and a handful of documents.
- D4 — Readiness is a progress bar with its number, never a color-only chip (accessibility safety boundary).
- D5 — Excluded vacancies are summarised, not listed (pending OQ-5).
- D6 — Candidate views carry no technical metadata (NG4); observability lives in logs and `/audit`.
- D7 — One Next.js app with three role route groups (`(candidate)`, `orientador`, `empresa`) and
  a shared design system, instead of separate apps. Rejected: separate apps per role — triples
  auth and theming work for the hackathon timeline.
- D8 — The web app reaches `ApplicationService` over the runtime's REST server through a BFF,
  not by importing it in-process. Rejected: in-process import — would put approval gates and the
  session-signing secret in the web execution plane and break the parent spec's seam.
- D9 — Mobile web is the candidate's primary target: layouts are designed at 360 px first and
  enhanced at `md` (768 px). Counselor/employer views are designed desktop-first but must pass AC-53.

## Risks and Open Questions

| Risk | Mitigation | Owner |
|---|---|---|
| R1 Solver matching per vacancy adds latency to `/vacantes` (geocoding + constraints) | Decisions fetched in parallel after the list renders; skeleton bars; cache per (candidate, vacancy, preferences version) | Backend lead |
| R2 Merging sources creates duplicates or conflicting levels | Merge by canonical skill id keeps the highest-evidence level and all evidence ids; unit tests in `@workbridge/profile` | Backend lead |
| R3 Web Speech API support is partial (absent in Firefox; varies on iOS) | Feature-detect and hide the mic (AC-06) | Frontend lead |
| R4 Profile carries few preference signals (only `target_roles`) | Preference phase capped at 6 chip-driven slots; the rest defaulted | Product owner |
| R5 In-memory stores lose data on restart, breaking accounts and returning visits | Persist preferences/searches to Neon like profiles | Backend lead |
| R6 Candidate name typed in chat is PII | Display name comes from the Better Auth user; chat greeting name stays client-side | Frontend lead |
| R7 Brand teal `#0EA5A4` fails contrast for text and controls (3.03:1 with white) | Actions use `#0F766E` (5.47:1); brand teal is decorative only | Design lead |
| R8 The LLM invents vacancies, courses, salaries, or promises outcomes | System prompt rules + grounding (AC-50) + adversarial eval set ([testing.md](testing.md)) | Backend lead |
| R9 Preferences lose their `candidate_explicit` origin | Values filled only by chip or confirmation (AC-47); preference handler stays LLM-free | Backend lead |
| R10 No streaming in `ChatFn`; a turn can take seconds | Typing indicator, "Estoy pensando…" after 3 s, 20 s timeout → fallback | Frontend lead |
| R11 Token cost grows with free conversation | Window of last 12 turns + slot summary; cap of 40 LLM turns per candidate session, after which turns use fallback questions only (AC-81, OQ-8) | Product owner |
| R12 Employer sees data that enables discrimination | Employer view limited to submitted documents and approved evidence (AC-72); `fairness.ts` rules apply | Backend lead |
| R13 Drafts need a domain `MatchDecision` (`gaps`, `biasAlerts`, `transport`) that the web does not produce today | Match endpoint ticket precedes the application tickets | Backend lead |
| R15 Application read endpoints do not exist in the runtime; G7–G9 lists cannot render without them | Runtime read-side ticket precedes the UI tickets for G7–G9 | Backend lead |
| R14 Role misassignment exposes another role's data | Server-layout role checks (AC-76) + runtime `requireRole` + e2e per role | Backend lead |

Open questions OQ-1 … OQ-11 are tracked with options and blocked work in
[open-questions.md](open-questions.md).

## Validation notes

- Checklist run on 2026-10-16: SC-01–SC-08 per criterion; SC-09–SC-14 whole spec.
- `[NEEDS CLARIFICATION]` markers open: **0**. Cleared on 2026-10-16 by the product owner: AC-07
  (OQ-2), AC-13/AC-75/AC-79 (OQ-3), AC-19 (OQ-1), AC-25 (OQ-5), AC-50 (OQ-7), AC-71 (OQ-10),
  R11 → AC-81 (OQ-8). OQ-4 resolved by G7; OQ-11 resolved (seed script); OQ-6 → AC-82;
  OQ-9 → AC-83. **All open questions resolved.**
- Revision 1 (2026-10-16): chat model corrected to LLM-guided (D1, NG1, AC-02/03, AC-46–AC-50).
- Revision 5 (2026-10-16): OQ-6, OQ-9 resolved; AC-82, AC-83 added; NG7 updated.
- Revision 4 (2026-10-16): OQ-5, OQ-8, OQ-10, OQ-11 resolved; AC-25, AC-71, NG3, NG8, R11 updated;
  AC-81 added.
- Revision 3 (2026-10-16): OQ-1, OQ-2, OQ-3, OQ-7 resolved; AC-07, AC-13, AC-18, AC-19, AC-50,
  AC-75, AC-79, R1, R2 updated.
- Revision 2 (2026-10-16): user corrections — applications (NG2 → G7), counselor and employer
  views (NG3 → G8, G9), Better Auth sessions (NG5 → G10), mobile web as a first-class target
  (NG7 → G6, AC-51–AC-54). AC-39 removed (replaced by AC-79).
- SC-09: every goal G1–G10 has criteria; NG1 is enforced by AC-47/AC-50, NG2 by AC-59/AC-61,
  NG3 by AC-71/AC-72, NG4 by AC-44, NG5 by AC-76/AC-77, NG6 by AC-05.
- SC-13: every criterion is ticket-ready.
- Published 2026-10-16 as #32 (`spec`, `ready-for-agent`); `to-tickets` sliced it into sub-issues
  #33–#51 in six waves (artifact: `.agents/skills/platform/artifacts/to-tickets/web-frontend/`).
