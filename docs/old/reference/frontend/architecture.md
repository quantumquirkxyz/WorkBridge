# Frontend Architecture

Produced with the `nextjs`, `react`, and `state-management` skills. Target: `apps/web`
(Next.js 16 App Router, React 19, TypeScript). Constraints: ADR-0002 (system boundaries),
ADR-0003 (approvals), ADR-0004/0005 (exploration and roadmap seams), parent spec #3 (internal
REST between `apps/web` and `apps/agent-runtime`; Better Auth).

## System context

```mermaid
flowchart LR
  subgraph Browser
    UI[React client components]
  end
  subgraph apps/web [apps/web — Next.js]
    RSC[Server components + layouts<br/>session & role checks]
    API[/api/* route handlers<br/>pure handlers in lib/]
    AUTH[/api/auth/[...all]<br/>Better Auth/]
    BFF[/api/applications/*<br/>BFF: sign session + forward/]
  end
  subgraph packages
    DOM[@workbridge/domain] --- CAT[@workbridge/catalog] --- TRN[@workbridge/training]
  end
  RT[apps/agent-runtime<br/>ApplicationService REST]
  LLM[(OpenRouter)]
  DB[(Neon Postgres)]
  UI --> RSC
  UI --> API
  UI --> AUTH
  UI --> BFF
  API --> DOM & CAT & TRN
  API -->|ChatFn, ProfileAgent| LLM
  API --> DB
  AUTH --> DB
  BFF -->|signed Better Auth session| RT
  RT --> DB
```

Execution plane: route handlers and the runtime. Data plane: packages and Neon. Safety
boundaries: Better Auth session (who), `ApplicationService` gates (what may happen), deterministic
handlers (preferences, exploration, roadmap). The LLM sits behind two seams only: `ProfileAgent`
(intake extraction, existing) and `handleChatTurn` (new).

## Route map

```
app/
├─ layout.tsx                      root: fonts, ThemeProvider, QueryProvider, Toaster
├─ (public)/
│  ├─ page.tsx                     S1 Bienvenida            (RSC; redirects by session/role)
│  └─ ingresar/page.tsx            S8 Ingresar              (client form)
├─ (candidate)/
│  ├─ layout.tsx                   server: session optional; role must be candidate|anonymous
│  ├─ chat/page.tsx                S2 Chat                  (client island)
│  └─ (nav)/
│     ├─ layout.tsx                BottomNav / TopNav
│     ├─ vacantes/page.tsx         S3/S4/S5 (?v=jobId)      (RSC shell + client list)
│     ├─ ruta/page.tsx             S6
│     ├─ perfil/page.tsx           S7
│     └─ postulaciones/
│        ├─ layout.tsx             server: requires signed-in candidate
│        ├─ page.tsx               S10
│        └─ [id]/page.tsx          S9
├─ orientador/
│  ├─ layout.tsx                   server: requires role counselor
│  ├─ page.tsx                     S11 queue
│  └─ [draftId]/page.tsx           S11 detail
├─ empresa/
│  ├─ layout.tsx                   server: requires role employer
│  ├─ page.tsx                     S12 queue
│  └─ [submissionId]/page.tsx      S12 detail
└─ api/
   ├─ auth/[...all]/route.ts       Better Auth handler (toNextJsHandler)
   ├─ chat/route.ts                POST  → lib/chat/handler.ts        (new)
   ├─ intake/route.ts              POST  (existing)
   ├─ profile/route.ts             GET   (new)
   ├─ preferences/route.ts         GET (new), POST, DELETE (existing)
   ├─ candidate/route.ts           DELETE profile+preferences+searches (new, CS-7)
   ├─ explore/route.ts             POST  (existing)
   ├─ match/route.ts               POST  (new; solver readiness, OQ-1)
   ├─ roadmap/route.ts             POST  (existing)
   ├─ searches/route.ts            GET, POST (existing)
   └─ applications/[...path]/route.ts  BFF to agent-runtime (new)
```

Role enforcement: each role group's `layout.tsx` calls
`auth.api.getSession({ headers: await headers() })` and redirects (`/ingresar?next=` when signed
out; role home when the role does not match). Route handlers re-check the session — layouts are
not a security boundary on their own (AC-76, AC-78).

## Server / client split

| Unit | Kind | Why |
|---|---|---|
| Layouts, page shells, Bienvenida, empty/error frames | Server components | Session reads, redirects, no JS for static content |
| Chat, vacancy list + sheet, Mi perfil form, draft editor, decision forms | Client components (`'use client'`) | Interaction, local state, URL state |
| Pure handlers (`lib/*-handler.ts`, `lib/chat/handler.ts`) | Server-only modules (`import 'server-only'`) | Testable without Next; secrets stay server-side |
| `lib/api/client.ts` | Client-safe | Typed `fetch` wrappers for `/api/*` |

Rule: a client component never imports from `lib/*-handler.ts`, `lib/*-store.ts`, `lib/auth.ts`,
or `@workbridge/agent-runtime`; enforced with an ESLint `no-restricted-imports` rule for files
containing `'use client'`.

## Component graph (candidate)

```
(candidate)/layout ── CandidateSessionProvider (useCandidateSession)
   ├─ chat/page ── ChatScreen
   │     ├─ useChat (transcript, slot state, send, retry) ──► api.chat / api.intake / api.explore
   │     ├─ MessageList ── BotBubble | UserBubble | ProfileSummaryCard | TypingIndicator
   │     ├─ QuickReplies
   │     └─ Composer ── VoiceButton (useSpeechInput) | AttachmentChip
   └─ (nav)/layout ── Nav
         ├─ vacantes/page ── VacancyList ── VacancyCard* ── ReadinessBar
         │                  ├─ NearMatchList ── NearMatchCard*
         │                  ├─ DiscardSummary
         │                  └─ VacancySheet (reads ?v=) ── VacancyDetail ── "Preparar mi postulación"
         ├─ ruta/page ── RoadmapList ── RoadmapStep*
         ├─ perfil/page ── ProfileSummary | PreferencesForm | SavedSearches | DeleteDataDialog
         └─ postulaciones/* ── ApplicationList | ApplicationView ── DocumentTabs | EvidenceChecklist | GateNotice | ActionBar
```

The current `ExplorationDashboard.tsx` (712 lines) is decomposed into `PreferencesForm`,
`VacancyList`, `NearMatchList`, `DiscardSummary`, `RoadmapList`, and `SavedSearches`; its fetch
logic moves to `lib/api/client.ts` and query hooks. `IntakeForm.tsx` is retired in favor of the
chat (its file-to-base64 helper moves to `lib/files.ts`).

## State

### Inventory

| State | Type | Owner | Lifetime | Primitive |
|---|---|---|---|---|
| Session user, role | server | Better Auth | cookie session | `auth.api.getSession` (server), `authClient.useSession` (client) |
| Candidate profile | server cache | `/api/profile` | until changed | TanStack Query `['profile']` |
| Preferences | server cache | `/api/preferences` | until changed | TanStack Query `['preferences']` |
| Latest exploration | server cache (computed) | `/api/explore` | per preferences version | TanStack Query `['exploration', prefsHash]` |
| Roadmap | server cache | `/api/roadmap` | per exploration | TanStack Query `['roadmap', explorationId]` |
| Saved searches | server cache | `/api/searches` | until changed | TanStack Query `['searches']` |
| Drafts / submissions | server cache | BFF → runtime | until changed | TanStack Query `['drafts']`, `['draft', id]` |
| Chat transcript + slot state | client + server | `useChat` | per candidate; restored on reload and after account linking | `useReducer`, persisted server-side under the anonymous or linked user id (OQ-3) |
| Selected vacancy | URL | router | shareable | `?v=jobId` via `useSearchParams` |
| Sheet open, collapsibles, chip selection | UI | component | ephemeral | `useState` |
| Theme | UI | `next-themes` | device | system preference |

### Primitives chosen

- **TanStack Query v5** for all server state: dedupe, retries with backoff, invalidation after
  mutations (`explore` invalidates `['exploration']` and `['roadmap']`; draft actions invalidate
  `['draft', id]` and `['drafts']`). Rejected: hand-rolled `useEffect` fetching (what exists today,
  CS-4); SWR (weaker mutation/invalidation story for the approval flow).
- **`useReducer` in `useChat`** for the chat state machine (events: `user_message`, `chip`,
  `turn_received`, `intake_ok`, `intake_failed`, `retry`). Rejected: XState — one machine, small graph.
- **No global client store.** `CandidateSessionProvider` only exposes the candidate id and derived
  flags (`hasProfile`, `hasPreferences`, `hasExplored`) computed from queries.
- URL is canonical for shareable UI state (selected vacancy, draft id).

### Async boundaries

Every query renders four states — loading (skeleton), empty, error (inline retry), success — as
specified in [ux-flows.md § State matrix](ux-flows.md#state-matrix). Mutations show pending state on
the triggering control and never optimistic-update approvals or submissions (they must reflect the
runtime's decision).

## API client

`lib/api/client.ts` exports one function per endpoint, typed with the package contracts:

```ts
export const api = {
  chat: (body: ChatTurnRequest) => post<ChatTurn>('/api/chat', body),
  intake: (body: IntakeRequest) => post<IntakeResult>('/api/intake', body),
  profile: () => get<CandidateProfile>('/api/profile'),
  preferences: () => get<CandidatePreferences>('/api/preferences'),
  explore: (draft: PreferencesDraft) => post<ExplorationResult>('/api/explore', draft),
  roadmap: (result: ExplorationResult) => post<{ roadmap: Roadmap | null }>('/api/roadmap', result),
  searches: { list: () => get<{ searches: SavedSearchView[] }>('/api/searches'), save: … },
  deleteCandidate: () => del('/api/candidate'),
  applications: { list, get, create, correct, approve, reject, submit, decideInterview, audit },
};
```

Errors are normalised to `ApiError { status, code, details?, message }`; UI maps `code` to copy
using the tables in [ux-flows.md](ux-flows.md#errors-and-recovery). The candidate id is **not**
passed from the browser once signed in: handlers derive it from the session (AC-78).

## Chat endpoint (`POST /api/chat`)

```
lib/chat/
├─ slots.ts        SlotId, slot definitions, priority, fallback question + chips (from ux-flows)
├─ tracker.ts      pure: (slotState, slotUpdates, userAction) → slotState, pendingSlot
├─ prompt.ts       system prompt builder: persona, rules (no promises, no submission, grounding),
│                  pending slot, slot summary, last 12 turns
├─ schema.ts       ChatTurn JSON Schema (Ajv via @workbridge/domain createAjv)
└─ handler.ts      handleChatTurn(body, { chat?: ChatFn, now? }) → { status, body: ChatTurn }
```

- `ChatFn` from `createOpenRouterChat` with `json_schema` response format; one retry on invalid
  output, then fallback (`source: "fallback"`). 20 s timeout via `AbortController`.
- The tracker, not the model, sets `pendingSlot` and `phase`. Model `slotUpdates` are accepted
  only as `proposed`; the client turns them into confirmation chips.
- PII: the request body carries no name; `redactPii` from `@workbridge/agent-runtime` (`src/pii.ts`)
  runs on the transcript before it reaches the model.
- Observability: each turn logs trace id, `source`, latency, token usage, and slot transitions —
  server-side only (NG4).

## Authentication (Better Auth)

- `lib/auth.ts` (server): `betterAuth({ database: Neon, socialProviders: { google: ... }, emailAndPassword: { enabled: false }, plugins: [magicLink(...), anonymous()] })`. The only account-linking methods exposed by `/ingresar` are Google (`Continuar con Google`) and an email magic link; password and other providers are not enabled (AC-75). Linking either method keeps the same `user.id`, which is the candidate id (OQ-3).
  The Better Auth user schema declares `employerOrgId` as a nullable server-managed field alongside `role`; it is included in the signed `BetterAuthSession.user` shape for employers and is never accepted from browser input (AC-71, AC-76, NG5).
  `input: false` stops clients from choosing a role at sign-up (NG5, R14).
- `lib/auth-client.ts` (client): `createAuthClient()` for sign-in/out and `useSession`.
- BFF: `app/api/applications/[...path]/route.ts` gets the session, maps it to the runtime's
  `BetterAuthSession` shape, signs it with `signBetterAuthSession(session, BETTER_AUTH_SESSION_SECRET)`,
  forwards method/path/body to `AGENT_RUNTIME_URL`, and adds `traceId` + `idempotencyKey` when the
  client omitted them (submission keys are generated client-side once per draft and reused on retry, AC-61).
- Roles: `role` and `employerOrgId` are never user-settable (`input: false`); `scripts/seed-roles.ts`
  (per environment) creates counselor and employer users, sets both server-side fields, and links
  seeded vacancies to the organization (OQ-11). Employers additionally carry `employerOrgId` in the
  signed session (OQ-10), and the BFF/runtime reject cross-organization reads with 403 (AC-71).
- Env: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `BETTER_AUTH_SESSION_SECRET` (shared with runtime),
  `AGENT_RUNTIME_URL`, `OPENROUTER_*`, `DATABASE_URL`. None are `NEXT_PUBLIC_*`.

## Folder structure

```
apps/web/
├─ app/                       routes (above)
├─ components/
│  ├─ ui/                     shadcn primitives
│  ├─ shared/                 EmptyState, ErrorState, StatusBadge, Nav…
│  ├─ chat/  vacancies/  roadmap/  profile/  applications/  counselor/  employer/
├─ lib/
│  ├─ api/client.ts  api/errors.ts  queries/*.ts       (client-safe)
│  ├─ chat/*  auth.ts  bff.ts  *-handler.ts  *-store.ts (server-only)
│  └─ format.ts  files.ts                              (shared pure helpers)
└─ tests/                     handler tests (existing) + component tests + e2e (see testing.md)
```

## Migration order (keeps `main` working)

1. Tailwind v4 + shadcn + tokens + fonts; existing components keep rendering (ADR-0007).
2. `lib/api/client.ts` + TanStack Query; port `ExplorationDashboard` fetches; fix CS-1.
3. Server additions: `GET /api/profile`, `GET /api/preferences`, `DELETE /api/candidate`, durable stores.
4. Candidate shell + `/vacantes`, `/ruta`, `/perfil` from decomposed dashboard parts.
5. `/api/chat` + chat UI; retire `IntakeForm`.
6. Better Auth + role layouts + `/ingresar`.
7. Runtime read endpoints + BFF; `/postulaciones`; then `/orientador`, `/empresa`.
8. (moved) `POST /api/match` (OQ-1) is required by the readiness bar in step 4; build it with step 3.
