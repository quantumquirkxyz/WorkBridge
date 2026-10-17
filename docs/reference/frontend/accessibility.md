# Accessibility

Produced with the `ux-accessibility` and `accessibility-design` skills. Target: **WCAG 2.2 AA** on
every surface, validated by task completion, not only by rule checks.

## Users, inputs, and environments

| Who | Consideration |
|---|---|
| Young candidates on low-end Android phones | Small screens, slow networks, data cost, on-screen keyboard covering content |
| Users with low literacy or reading fatigue | Short sentences, chips instead of typing, voice input, no jargon |
| Screen reader users (TalkBack, VoiceOver, NVDA) | Chat must announce new messages without stealing focus |
| Keyboard and switch users | Full flows without pointer; visible focus |
| Low vision / color-blind users | Contrast tokens, status never by color alone, 200 % zoom |
| Motor impairments | 44 px targets, no drag-only interactions (sheet closes with button and Esc) |
| Counselors and employers on desktop | Dense lists that remain navigable by headings and landmarks |

Input modes kept for every task: touch, pointer, keyboard, voice (chat), assistive technology.

## Barriers ranked by task impact

| # | Barrier | Task | Impact | Design response |
|---|---|---|---|---|
| B1 | New chat messages not announced, or focus jumps on each message | J1 | Blocks | `role="log"` + `aria-live="polite"` on the message list; focus stays in the composer; chips are announced as a group "Respuestas sugeridas" |
| B2 | Long LLM wait with no feedback | J1 | High | Typing indicator announced once ("WorkBridge está escribiendo"); "Estoy pensando…" after 3 s; no timeouts that discard input |
| B3 | Readiness shown only as a colored bar | J2 | High | `Progress` with `aria-valuenow`, visible "80 %" text and label "Preparación" (D4) |
| B4 | Bottom sheet traps or loses focus | J2 | High | Radix `Sheet` (Dialog semantics): focus moves to the title, Esc and × close, focus returns to the originating card |
| B5 | Status badges distinguishable only by color | J7–J9 | High | Icon + text in every `StatusBadge` and verification badge |
| B6 | Destructive and approval actions activated by accident | J5, J7–J9 | High | Confirmation dialog, "Cancelar" focused by default, required reason fields with visible labels |
| B7 | On-screen keyboard hides the composer or action bar | J1, J7 | High | `interactive-widget=resizes-content` viewport, `dvh` units, safe-area padding (AC-52) |
| B8 | Session expiry loses work | J7 | Medium | Draft edits saved through corrections; 401 redirects with `?next=` and restores the view |
| B9 | Voice input fails silently | J1 | Medium | Permission errors shown as text; mic hidden when unsupported (AC-06) |
| B10 | Motion from sheets, typing dots | all | Low | `prefers-reduced-motion` honoured (design-system § motion) |

## Rules

### Structure and semantics
- One `h1` per page; headings follow the screen outline in [screens.md](screens.md).
- Landmarks: `header`, `nav` (labelled "Principal"), `main`, and `aside` for the desktop detail pane.
- `lang="es"` on `<html>`; page `<title>` per route, e.g. "Vacantes — WorkBridge".
- Route changes move focus to the page `h1` and announce the title (Next.js route announcer kept).

### Forms and decisions
- Every input has a visible `<Label>`; hints linked with `aria-describedby`; errors linked and
  announced via `aria-live="assertive"` only on submit.
- Chip groups: `role="group"` with `aria-label`; multi-select chips use `aria-pressed`.
- Reason fields for approvals/rejections are required, labelled "Motivo de tu decisión", with a
  character counter announced politely.

### Focus and keyboard
- Focus ring: 3 px `--ring` + 2 px offset, ≥ 3:1 against adjacent colors in both themes.
- Tab order follows visual order; the chat composer is reachable in one Tab from the last message.
- `Enter` sends a chat message; `Shift+Enter` inserts a newline; chips activate with `Enter`/`Space`.
- No keyboard traps except inside open dialogs/sheets (by design, with Esc to exit).

### Content
- Plain-language copy (voice and tone in [design-system.md](design-system.md#voice-and-tone-es-pa)); average sentence ≤ 15 words in candidate views.
- Abbreviations expanded on first use ("USD").
- Links that open a new tab say so: "Ver vacante original (se abre en otra pestaña)" as visually hidden text.

### Media and voice
- Illustrations are decorative (`alt=""`).
- Voice transcription is always shown as editable text before sending.

## Validation tasks

Run per release candidate, on phone (TalkBack + Chrome, VoiceOver + Safari) and desktop (NVDA + Firefox, keyboard only):

| Task | Pass condition |
|---|---|
| V1 Complete J1 with a screen reader | Every bot message is heard once; all slots completable; results reached |
| V2 Complete J1 with keyboard only | No pointer used; focus always visible |
| V3 Open and close a vacancy detail (J2) | Focus enters the sheet and returns to the same card |
| V4 Approve and send an application (J7) | Status change announced; send impossible before approval |
| V5 Counselor rejects with reason (J8) | Required-field error announced; decision appears in "Historial" |
| V6 Use the app at 200 % zoom and 320 px reflow | No loss of content or function; no horizontal scroll |
| V7 Use the app with `forced-colors: active` | Controls, focus, and progress remain visible |

Automated: `@axe-core/playwright` on every route in both themes (AC-40) — see [testing.md](testing.md).
