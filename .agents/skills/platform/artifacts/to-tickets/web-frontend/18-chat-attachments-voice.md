# Add CV attachments and voice input to the chat

**Issue:** #50

**Owner:** MateoDG2006
**Parent spec:** #32
**Labels:** `ready-for-agent`
**Metadata**

- Project: none
- Milestone: none
- Fields: `work_type` = Ticket; `repo_scope` = web; `phase` = build; `priority` = medium; `risk` = medium; `sprint` = hackathon  ; `release_train` = none
- Todo: none
**Docs:** [Profile phase (slot 1)](https://github.com/HackathonFISC/equipo-02/blob/docs/frontend-spec/docs/reference/frontend/ux-flows.md#profile-phase) · [Screen S2](https://github.com/HackathonFISC/equipo-02/blob/docs/frontend-spec/docs/reference/frontend/screens.md#s2--chat-chat) · [Spec (AC-04–AC-07)](https://github.com/HackathonFISC/equipo-02/blob/docs/frontend-spec/docs/reference/frontend/spec.md)

## Context
Completes G1 input modes. The CV is sent to `/api/intake` as soon as it is attached; the server merge from #34 combines it with the chat transcript.

## Acceptance Criteria
- [ ] The attach control accepts one PDF (`application/pdf`) or one image (`image/*`) up to 10 MB; larger or wrong-type files show the specified Spanish messages and are not sent (AC-04).
- [ ] An attached file shows an `AttachmentChip` with name, size, and remove; it is one captured source sent in its own `POST /api/intake` under the same server-derived candidate id as the chat source. The server merges by canonical id, appends evidence, removes no previously stored item, and profile slots are re-evaluated so only gaps are asked (AC-07).
- [ ] In browsers with `SpeechRecognition` or `webkitSpeechRecognition`, the mic transcribes (`es-PA`, fallback `es-419`) into the input for review (AC-05); otherwise the mic is not rendered (AC-06).
- [ ] Mic permission denial shows "No tengo permiso para usar el micrófono. Puedes escribir tu respuesta." and focuses the input.
- [ ] When every answer in the profile phase came from voice, the transcript intake uses `kind: "audio_transcript"`.

## Validation
Component tests with mocked `SpeechRecognition` and file inputs. e2e: attach the PDF fixture, then finish by chat; assert two intake requests use the same candidate identity and the profile contains items from both sources without removing a pre-existing item.

## Blocked By
- #49 — Build the welcome screen and the chat UI from profile capture to first exploration
- #34 — Merge multiple intake sources into one candidate profile on the server

## Risks
Speech support varies on iOS (R3); feature detection keeps typing as the always-available path.
