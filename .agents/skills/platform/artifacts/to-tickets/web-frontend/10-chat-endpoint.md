# Add the LLM-guided chat endpoint with the slot agenda, fallback, and turn cap

**Issue:** #42

**Owner:** MateoDG2006
**Parent spec:** #32
**Labels:** `ready-for-agent`
**Metadata**

- Project: none
- Milestone: none
- Fields: `work_type` = Ticket; `repo_scope` = web; `phase` = build; `priority` = high; `risk` = high; `sprint` = hackathon  ; `release_train` = none
- Todo: none
**Docs:** [Chat model](https://github.com/HackathonFISC/equipo-02/blob/docs/frontend-spec/docs/reference/frontend/ux-flows.md#chat-model) · [Slot agenda](https://github.com/HackathonFISC/equipo-02/blob/docs/frontend-spec/docs/reference/frontend/ux-flows.md#slot-agenda) · [Architecture: chat endpoint](https://github.com/HackathonFISC/equipo-02/blob/docs/frontend-spec/docs/reference/frontend/architecture.md#chat-endpoint-post-apichat) · [ADR-0006](https://github.com/HackathonFISC/equipo-02/blob/docs/frontend-spec/.agents/adr/0006-guided-chat-intake.md) · [LLM eval set](https://github.com/HackathonFISC/equipo-02/blob/docs/frontend-spec/docs/reference/frontend/testing.md#llm-behavioral-eval-set-r8)

## Context
Execution-plane seam for the conversation (D1, ADR-0006). A deterministic SlotTracker decides what is missing; the LLM (`createOpenRouterChat`, JSON-schema output) writes replies, answers free questions, and proposes values; the user confirms. No UI in this slice; it is verified through handler tests and the eval set.

## Acceptance Criteria
- [ ] `lib/chat/slots.ts` defines the profile and preference slots, priorities, fallback questions, and chips exactly as in the slot agenda.
- [ ] `lib/chat/tracker.ts` is pure and picks the highest-priority `missing`/`incomplete` slot; model `slotUpdates` are accepted only as `proposed`; only a chip or a confirmation fills a slot (AC-02, AC-47).
- [ ] `POST /api/chat` returns a `ChatTurn` validated with Ajv (`createAjv` from `@puente/domain`); `reply` ≤ 600 characters (AC-48).
- [ ] An off-slot user question gets an answer and the pending slot is re-asked unchanged (AC-46).
- [ ] Invalid model output is retried once, then the slot's fallback is returned with `source: "fallback"`; a 20 s timeout and a missing `OPENROUTER_API_KEY` also produce the fallback (AC-48). With no API key, an off-slot/free-text question returns exactly `Ahora mismo solo puedo ayudarte a completar tu perfil. ¿Seguimos?` (AC-49).
- [ ] After 40 LLM turns per candidate session, turns use fallback only and the first capped reply is "Sigamos con lo importante para encontrarte vacantes." (AC-81).
- [ ] The transcript is passed through `redactPii` before the model call; the prompt includes only this candidate's profile, exploration, match decisions, and roadmap (AC-50).
- [ ] Transcript and slot state are persisted per candidate so a reload or account link restores them (AC-12).
- [ ] Each turn logs source, latency, token usage, and slot transitions server-side only.

## Validation
Table-driven unit tests for the tracker; handler tests with a fake `ChatFn` (valid, invalid JSON, throws, slow, missing key, cap reached), including an exact assertion for the AC-49 no-key free-text response. Opt-in eval suite `RUN_LLM_EVALS=1` with cases E1–E8 from `testing.md` passes against the configured model.

## Blocked By
- #39 — Derive the candidate id from the session and persist profile, preferences, and saved searches with read and delete endpoints

## Risks
Prompt quality drives UX; keep the prompt in `lib/chat/prompt.ts` and version it with the eval results.
