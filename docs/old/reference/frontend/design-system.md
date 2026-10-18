# Design System

Produced with the `design-system` and `styling` skills. Personality: **close and youthful**
("cercano y juvenil") for candidates, the same system in a calmer density for counselor and
employer surfaces. Stack: Tailwind CSS v4 + shadcn/ui (Radix primitives) + CVA — see
[ADR-0007](../../../.agents/adr/0007-web-styling-tailwind-shadcn.md).

## Principles

1. **Warm, never childish.** Rounded shapes, friendly copy, and emoji in the chat only; serious
   flows (applications, approvals, deletion) stay plain and precise.
2. **Meaning never by color alone.** Every status pairs color with an icon and text.
3. **Mobile first.** Designed at 360 px, enhanced at `md` (768 px) and `lg` (1024 px).
4. **Tokens, not values.** Components use semantic tokens only; raw hex lives in this file and in
   `globals.css`.

## Color

### Primitives

| Token | Light | Dark | Use |
|---|---|---|---|
| `teal-brand` | `#0EA5A4` | `#2DD4BF` | Decorative fills, illustrations, logo — **never text or control boundary in light** |
| `teal-700` | `#0F766E` | — | Primary actions and links (light) |
| `teal-tint` | `#D9F2F0` | `#12302E` | User chat bubble, selected chip background |
| `coral` | `#FF6B5B` | `#FF8A7D` | Accent: highlights, progress milestones, badges with ink text |
| `coral-tint` | `#FFE4DF` | `#3A1F1B` | Accent backgrounds |
| `coral-ink` | `#7A2E1F` | `#FFE4DF` | Text on `coral-tint` |
| `cream` | `#FFF8F0` | — | App background (light) |
| `night` | — | `#0B1416` | App background (dark) |
| `ink` | `#1A2B2E` | `#E6F1F0` | Body text |
| `ink-muted` | `#4B5F63` | `#9FB3B5` | Secondary text |
| `line` | `#E8E1D8` | `#1F3335` | Decorative dividers, progress track |
| `line-strong` | `#6F8285` | `#7C9497` | Input and control borders (3:1 required) |
| `success` | `#15803D` | `#4ADE80` | Verified, apt, success |
| `warning` | `#B45309` | `#FBBF24` | Pending review, unverified |
| `danger` | `#B91C1C` | `#F87171` | Destructive, rejected, errors |

### Semantic tokens (shadcn variable names)

| Token | Light | Dark |
|---|---|---|
| `--background` | `cream` | `night` |
| `--foreground` | `ink` | `ink` (dark) |
| `--card` / `--popover` | `#FFFFFF` | `#132224` |
| `--primary` | `teal-700` | `teal-brand` (dark `#2DD4BF`) |
| `--primary-foreground` | `#FFFFFF` | `night` |
| `--secondary` | `teal-tint` | `teal-tint` (dark) |
| `--accent` | `coral` | `coral` (dark) |
| `--accent-foreground` | `ink` | `night` |
| `--muted-foreground` | `ink-muted` | `ink-muted` (dark) |
| `--border` | `line` | `line` (dark) |
| `--input` | `line-strong` | `line-strong` (dark) |
| `--ring` | `teal-700` | `teal-brand` (dark) |
| `--destructive` | `danger` | `danger` (dark) |

### Contrast

Measured with the WCAG 2.x relative-luminance formula (2026-10-16). Text needs 4.5:1; large text
and non-text UI (borders, focus, progress) need 3:1.

| Pair | Ratio | Verdict |
|---|---|---|
| white on `teal-brand` `#0EA5A4` | 3.03 | ✗ text — reason for R7; decorative only |
| `teal-brand` on cream (non-text) | 2.87 | ✗ — never as control boundary |
| white on `teal-700` (primary button) | 5.47 | ✓ |
| `teal-700` on cream (links) | 5.20 | ✓ |
| `teal-700` on `teal-tint` | 4.67 | ✓ |
| ink on cream | 13.95 | ✓ |
| ink-muted on cream / on white card | 6.40 / 6.74 | ✓ |
| ink on `teal-tint` (user bubble) | 12.53 | ✓ |
| white on coral | 2.80 | ✗ — never white on coral |
| ink on coral (accent badge) | 5.25 | ✓ |
| `coral-ink` on `coral-tint` | 7.78 | ✓ |
| `line-strong` on cream / white (input border) | 3.83 / 4.03 | ✓ non-text |
| progress fill `teal-700` vs track `line` | 4.22 | ✓ non-text |
| warning / success / danger on cream | 4.77 / 4.76 / 6.14 | ✓ |
| white on danger (destructive button) | 6.47 | ✓ |
| Dark: text on `night` / on card `#132224` | 16.17 / 14.20 | ✓ |
| Dark: muted on `night` / on card | 8.52 / 7.48 | ✓ |
| Dark: `night` on `#2DD4BF` (primary button) | 10.02 | ✓ |
| Dark: `line-strong` on card | 5.10 | ✓ non-text |
| Dark: progress fill vs track | 7.13 | ✓ non-text |
| Dark: warning / success / danger on `night` | 11.17 / 10.70 / 6.74 | ✓ |

Rule: any new color pair is added to this table with its measured ratio before use.

## Typography

Font: **Plus Jakarta Sans** via `next/font/google` (weights 400, 500, 600, 700; `display: swap`;
subsets `latin`, `latin-ext`). Fallback `system-ui, sans-serif`.

| Token | Size / line height (mobile → md) | Weight | Use |
|---|---|---|---|
| `display` | 32/38 → 44/52 | 700 | Welcome H1 |
| `h1` | 26/32 → 32/40 | 700 | Page titles |
| `h2` | 20/28 → 24/32 | 600 | Section titles |
| `h3` | 17/24 | 600 | Card titles |
| `body` | 16/24 | 400 | Default; never smaller on inputs (prevents iOS zoom) |
| `body-sm` | 14/20 | 400 | Meta, hints |
| `label` | 14/20 | 600 | Form labels, chips |
| `caption` | 12/16 | 500 | Badges only |

## Spacing, radius, elevation, motion

- Spacing: Tailwind 4 px scale; page gutter 16 px (phone) / 24 px (md) / 32 px (lg); card padding 16/20 px.
- Max widths: chat column 640 px; content 1120 px; reading text 65 ch.
- Radius: `--radius: 1rem` (cards, sheets) · inputs/buttons `0.75rem` · chips/badges `9999px` · chat bubbles `1.25rem` with the tail corner `0.375rem`.
- Elevation: `shadow-sm` cards; `shadow-lg` sheets/dialogs; dark theme uses borders instead of shadows.
- Motion: 150 ms (hover/press), 200 ms (chips, toasts), 300 ms (sheets), easing `cubic-bezier(0.2, 0, 0, 1)`.
  `prefers-reduced-motion: reduce` → no transforms, opacity fades ≤ 100 ms, typing dots static.

## Breakpoints

| Name | Min width | Layout change |
|---|---|---|
| base | 0 | single column, BottomNav, detail as bottom sheet |
| `md` | 768 px | TopNav, detail as right panel, two-column Mi perfil |
| `lg` | 1024 px | list + persistent detail pane for counselor/employer |

## Components

### From shadcn/ui (generated into `apps/web/components/ui/`)

`Button`, `Card`, `Badge`, `Progress`, `Sheet`, `Dialog`, `AlertDialog`, `Collapsible`,
`ToggleGroup`, `Checkbox`, `Input`, `Textarea`, `Select`, `Label`, `Tabs`, `Skeleton`,
`Sonner` (toast), `Avatar`, `DropdownMenu`, `Separator`, `ScrollArea`.

### Variants (CVA)

| Component | Variant axis | Values |
|---|---|---|
| `Button` | `variant` | `primary` (teal-700), `secondary` (teal-tint + ink), `ghost`, `outline`, `destructive` (danger), `link` |
| `Button` | `size` | `sm` (36 px, desktop only), `md` (44 px, default), `lg` (52 px, primary CTAs on phone) |
| `Badge` | `tone` | `neutral`, `success`, `warning`, `danger`, `accent` — each with a required icon |
| `Chip` (QuickReply) | `state` | `idle`, `selected`, `disabled`; `kind`: `answer`, `confirm`, `change`, `retry` |
| `ReadinessBar` | `level` | `high` (≥ 70), `mid` (40–69), `low` (< 40) — level changes the label text and icon, fill color stays `primary` |

### Product components

| Component | Surface | Notes |
|---|---|---|
| `BotBubble`, `UserBubble`, `TypingIndicator`, `QuickReplies`, `Composer`, `VoiceButton`, `AttachmentChip`, `ProfileSummaryCard` | Chat | Bubbles max 85 % width; composer sticky |
| `VacancyCard`, `NearMatchCard`, `VacancyDetail`, `ReadinessBar`, `DiscardSummary` | Vacantes | Whole card is the hit target |
| `RoadmapStep` | Mi ruta | Numbered, vertical connector |
| `PreferencesForm`, `SkillChips`, `ExperienceList`, `DeleteDataDialog` | Mi perfil | |
| `StatusBadge`, `ApplicationTimeline`, `DocumentTabs`, `EvidenceChecklist`, `GateNotice`, `DecisionForm`, `ActionBar` | Postulaciones, Orientador, Empresa | `DecisionForm` = reason textarea + approve/reject |
| `BottomNav`, `TopNav`, `RoleMenu` | Shell | |
| `EmptyState`, `ErrorState` | All | Illustration + title + body + one action |

Ownership rule: `components/ui/*` = generated shadcn primitives (edited only to apply tokens);
`components/<feature>/*` = product components; a product component used by ≥ 2 features moves to
`components/shared/`.

## Iconography and illustration

- Icons: **Lucide** (`lucide-react`), 20 px in UI, 24 px in nav, `stroke-width: 2`; icons next to
  text are `aria-hidden`; icon-only buttons have an `aria-label`.
- Status icons: `CheckCircle2` success, `Clock` pending, `AlertTriangle` warning, `XCircle` danger,
  `Sparkles` accent.
- Illustrations: flat, two-tone (teal-brand + coral on cream), used only in Bienvenida, empty
  states, and Ingresar. Decorative → `alt=""`.

## Voice and tone (es-PA)

- Second person, **tú**, short sentences, positive framing: "Te falta" rather than "No cumples".
- Gender-neutral wording: "Me interesa tomar cursos", "orientador/a", "¿Cómo te llamo?".
- Name the next step in every message ("Ver mi ruta", "Revisar y aprobar").
- Never promise outcomes ("vas a conseguir trabajo"); never blame ("error tuyo").
- Counselor and employer copy: neutral and formal-light ("Motivo de tu decisión").
- Numbers: `USD 600`, `hace 2 h`, dates `16 oct 2026` (`Intl.DateTimeFormat('es-PA')`).

## Theming

- Tokens declared as CSS variables in `app/globals.css` under `:root` and `.dark`, mapped through
  Tailwind v4 `@theme inline`.
- Theme follows `prefers-color-scheme` (AC-43) via `next-themes` with `attribute="class"`,
  `defaultTheme="system"`, `enableSystem`; no visible toggle in this spec.
- `forced-colors: active`: borders use `CanvasText`, focus ring `Highlight`; progress fill keeps a
  border so it remains visible.

## Governance

- Token changes: PR touching `globals.css` + this file, reviewed by the design lead role; contrast
  table updated in the same PR.
- New component: check the shadcn inventory first; document variants here before merging.
