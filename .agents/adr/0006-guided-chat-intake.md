# ADR-0006: Capture the candidate profile through an LLM-guided chat over a deterministic slot agenda

## Status

Proposed — 2026-10-16. Review when the chat endpoint ships; OQ-7 and OQ-8 were resolved in the
frontend specification revision.

## Context

The candidate web app (`apps/web`) captures profiles through a source selector and a long form
(`IntakeForm`, `ExplorationDashboard`). The target users — young people in Panama, often with
only informal experience — need a conversational entry that:

- asks for what is still missing or incomplete in their profile and preferences;
- lets them ask questions freely ("¿qué hace alguien de soporte técnico?") and get answers;
- works on a phone, by text, chips, voice, or an attached CV.

Constraints from existing decisions:

- ADR-0002 assigns aptitude to the deterministic solver; ADR-0003 gates applications behind human
  approval. A conversational agent must not decide either.
- `exploration-handler.ts` states that preferences never pass through a language model: they are
  `candidate_explicit` and validated against `CandidatePreferences`.
- `@puente/agent-runtime` already provides `createOpenRouterChat` (JSON-schema structured output,
  no streaming) and falls back to heuristics when `OPENROUTER_API_KEY` is absent.

## Decision

Build the chat as an **LLM-guided conversation over a deterministic slot agenda**, exposed by one
new seam, `POST /api/chat` (`handleChatTurn`):

1. A deterministic **SlotTracker** owns the agenda (profile and preference slots, priority,
   states `missing` / `incomplete` / `proposed` / `filled`) and picks the pending slot every turn.
2. The **LLM** (`ChatFn`, JSON-schema `ChatTurn`) writes the reply, asks for the pending slot,
   answers free questions before steering back, and may *propose* slot values read from free text.
3. A proposed value becomes `filled` only when the user taps a chip or confirms it explicitly.
   Preferences therefore keep their `candidate_explicit` origin, and the preference handler stays
   LLM-free.
4. On a missing key, a model error, invalid output after one retry, or a 20 s timeout, the server
   returns the slot's **deterministic fallback question**; the flow never dead-ends.
5. When profile slots are complete, the transcript goes to the existing `/api/intake`
   (`ProfileAgent`); exploration and roadmap use their existing deterministic handlers.
6. The assistant takes no actions: it cannot submit or approve applications, decide aptitude, or
   save unconfirmed values, and it does not promise outcomes.

## Consequences

- Positive: a natural, mobile-friendly conversation that still guarantees profile completeness;
  free questions are answered; the LLM is isolated behind one testable seam with a fake `ChatFn`.
- Positive: existing intake, preference, exploration, and roadmap seams are unchanged.
- Negative: an extra endpoint, a JSON Schema, a prompt, and an eval set to maintain; token cost
  grows with free conversation (OQ-8).
- Risk: hallucinated vacancies, salaries, or promises (mitigated by grounding rules, OQ-7, and the
  adversarial eval set in `docs/old/reference/frontend/testing.md`).
- Risk: no streaming means multi-second turns; mitigated with typing feedback and timeouts.

## Alternatives considered

- **Scripted chat without an LLM.** Rejected by the product owner on 2026-10-16: it cannot answer
  free questions or adapt follow-ups to incomplete answers.
- **Unconstrained LLM agent (the model decides what to ask and when it is done).** Rejected: no
  guarantee of profile completeness, harder to test, and it would let the model infer preferences,
  breaking the `candidate_explicit` contract.
- **Form-based wizard.** Rejected by the product owner: less approachable for the target users.
- **Incremental intake after every message.** Deferred: more LLM calls and profile churn; the
  tracker plus one intake at the end of the profile phase is enough for the MVP.

## Links

- Spec: `docs/old/reference/frontend/spec.md` (G1, D1, AC-02, AC-46–AC-50)
- Flows: `docs/old/reference/frontend/ux-flows.md` (§ Chat model, § Slot agenda)
- Related: ADR-0002, ADR-0003, ADR-0005
