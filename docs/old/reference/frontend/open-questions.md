# Open Questions (refinement log)

Run with the `grill-with-docs` discipline: each question names its owner, the options, a
recommendation, and the work it blocks. An answer is recorded here with the date and the person
or role who decided, then propagated to the affected documents in the same change. The spec is
ticket-ready when every row is **Resolved** — reached on 2026-10-16.

| ID | Question | Owner | Blocks | Status |
|---|---|---|---|---|
| OQ-1 | Where does the vacancy readiness % come from? | Product owner | AC-19; tickets vacancy-card, match-endpoint | **Resolved** 2026-10-16: A, solver |
| OQ-2 | How do chat text and an attached CV combine into one profile? | Backend lead | AC-07; ticket chat-attachments | **Resolved** 2026-10-16: A, server merge |
| OQ-3 | Sign-in methods, anonymous start, and candidate identity | Product owner | AC-13, AC-75, AC-79; tickets auth-ui, candidate-identity, anonymous-upgrade | **Resolved** 2026-10-16: anonymous until saving/applying; Google + magic link; `candidate_id = user.id` |
| OQ-4 | Do applications belong in the web scope? | Product owner | — | **Resolved** 2026-10-16 (user): yes → G7 |
| OQ-5 | Show excluded vacancies individually? | Product owner | AC-25; ticket vacancy-list | **Resolved** 2026-10-16: A, summary line |
| OQ-6 | Where does a saved search surface new matches? | Product owner | ticket saved-searches | **Resolved** 2026-10-16: nav badge + "Nuevas" section (AC-82) |
| OQ-7 | What may the chat assistant talk about, and with which data? | Product owner | AC-50; ticket chat-grounding | **Resolved** 2026-10-16: A, own data + labelled general guidance |
| OQ-8 | Chat cost budget per session | Product owner | R11; ticket chat-endpoint | **Resolved** 2026-10-16: 40 LLM turns, then fallback (AC-81) |
| OQ-9 | Installable PWA for the mobile web? | Product owner | ticket pwa | **Resolved** 2026-10-16: installable, no offline/push (AC-83) |
| OQ-10 | How are employers linked to vacancies, and is their scope only interview decisions? | Backend lead + product owner | AC-71; ticket employer-scope | **Resolved** 2026-10-16: interview decisions only; org owns vacancies |
| OQ-11 | How do users get the `counselor` and `employer` roles? | Product owner | NG8; ticket role-provisioning | **Resolved** 2026-10-16: per-environment seed script |

---

## OQ-1 — Readiness source

**Context.** Exploration returns `matchScore` (0–100 compatibility with *declared preferences*,
`@workbridge/catalog`). The solver returns `MatchDecision.score` + `aptitude` (Apt / Apt with gaps /
Not currently apt) using the *profile* (`@workbridge/solver` via `MatchingService`, issue #20), but no
web route exposes it (CS-3). Drafts (G7) require a domain `MatchDecision` anyway (R13).

| Option | Pros | Cons |
|---|---|---|
| A. Solver `MatchDecision.score` via new `POST /api/match` — label "Preparación" | Real aptitude; same data the application gates use; shows "Te falta" from gaps | Needs vacancy `JobRequirements` + geocoding per vacancy; more latency |
| B. Exploration `matchScore` — label "Compatibilidad" | Available today, fast | Not aptitude; misleading if labelled "Preparación" (R1) |
| C. B on the list, A in the detail and before drafting | Fast list, accurate where it matters | Two numbers for one vacancy can confuse |

**Recommendation:** A, with B as a loading placeholder only if A exceeds 2 s.

**Decision (2026-10-16, product owner):** A. The bar reads "Preparación" and shows a skeleton
while the decision loads, with no placeholder score (AC-19). New work: `POST /api/match`.

## OQ-2 — Combining chat and CV

**Context.** `/api/intake` takes one source per call; `profileStore.save` replaces the profile for
the same candidate id, so a second call overwrites the first (R2).

| Option | Pros | Cons |
|---|---|---|
| A. Server merge: intake with an existing candidate id merges skills/experiences/evidence by canonical id | Any number of sources; matches "complete what is missing" | New merge logic in `@workbridge/profile` + tests |
| B. Attachment first, then chat text sent with `candidateId` and merged only for empty fields | Smaller change | Loses chat details that overlap the CV |
| C. One source only: if a CV is attached, chat only fills preference slots | Simplest | Informal experience missing from the CV is lost — against the product promise |

**Recommendation:** A.

**Decision (2026-10-16, product owner):** A, server-side merge by canonical id (AC-07, R2). New
work: merge in `@workbridge/profile` / `ProfileAgent` when the candidate already has a profile.

## OQ-3 — Authentication and identity

**Context.** Better Auth with roles `candidate`, `employer`, `counselor` is in the stack
(`apps/agent-runtime/src/application/roles.ts`, ticket 09). Open: which sign-in methods, and
whether candidates can start before creating an account.

Sub-questions:
1. Methods: Google · email magic link · email + password · phone/SMS OTP (SMS was a parent-spec non-goal).
2. Anonymous start (Better Auth `anonymous` plugin, linked on sign-up) vs sign-in before the chat.
3. Candidate id = Better Auth `user.id`? (recommended — removes the derived id of CS-2).

**Recommendation:** Google + email magic link; anonymous start allowed until "Guardar búsqueda" or
"Preparar mi postulación"; `candidate_id = user.id`.

**Decision (2026-10-16, product owner):** as recommended (AC-13, AC-75, AC-79).

## OQ-5 — Excluded vacancies

| Option | Notes |
|---|---|
| A. One summary line with counts by cause (current AC-25) | Least noise; recommended |
| B. Collapsible list "Ver las {n} que no encajan" with title + cause | Transparency, more scroll |

**Decision (2026-10-16, product owner):** A (AC-25).

## OQ-6 — Saved searches

No email/WhatsApp/SMS channels in the MVP (parent spec). Options: badge on "Vacantes" + "N nuevas"
section at the top of `/vacantes` (recommended), or only inside Mi perfil.

**Decision (2026-10-16, product owner):** badge + section (AC-82).

## OQ-7 — Chat scope and grounding

| Option | Notes |
|---|---|
| A. Product data for this candidate (profile, exploration, roadmap) + general career guidance labelled as general | Recommended; needs those documents in the prompt context |
| B. Product data only; anything else → redirect | Safest, least helpful |
| C. Open conversation | Highest hallucination risk (R8) |

Also decide: during free conversation, may the assistant read the catalog (e.g. "¿hay vacantes de
soporte en Arraiján?") before preferences are complete? Recommended: no — it suggests finishing
the slots first.

**Decision (2026-10-16, product owner):** A (AC-50). The catalog sub-question follows the
recommendation (no catalog reads before preferences are complete) unless revisited.

## OQ-8 — Cost budget

Decide a turn cap per session (recommended 40 turns) and the model (`OPENROUTER_MODEL`). After the
cap the chat continues with fallback questions only.

**Decision (2026-10-16, product owner):** 40 LLM turns per candidate session, context window of
12 turns + slot summary (AC-81, R11). Model choice stays in `OPENROUTER_MODEL`.

## OQ-9 — PWA

Recommended: web app manifest + icons + theme color (installable, home-screen icon); no offline
mode or push notifications in this spec.

**Decision (2026-10-16, product owner):** as recommended (AC-83, NG7).

## OQ-10 — Employer scope

The runtime's `DraftInput` has `vacancyId` but no employer link, so "submissions for my vacancies"
cannot be filtered yet. Decide the ownership model (employer org ↔ vacancy) and confirm that
employers only decide interview progression (NG3) — no vacancy publishing or candidate search.

**Decision (2026-10-16, product owner):** interview decisions only. Model: an employer user
belongs to one organization (`employerOrgId`); vacancies carry `employerOrgId`; the employer queue
shows submissions for that organization's vacancies (AC-71).

## OQ-11 — Role provisioning

Options: seed script per environment (recommended for the hackathon), invitation links, or Better
Auth `admin` plugin with an internal page (out of scope by NG8).

**Decision (2026-10-16, product owner):** seed script per environment that creates counselor and
employer accounts, their organization, and links seeded vacancies to it (NG8).
